/**
 * usePopupSheet — all state, effects, and handlers for PopupSheet.
 * Extracted from the component so PopupSheet.tsx is a pure render layer.
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { LocationData } from '../../types/location';
import { AccessibilityLocation, Media } from '../../types/media';
import { useLocationContext } from '../../services/LocationContext';
import { useMapUI } from '../../services/MapUIContext';
import { useAuth } from '../../services/AuthContext';
import {
    uploadMedia,
    getLocationMediaByCategory,
    deleteMediaFromStorage,
} from '../../services/firebase/storage';
import { arrayUnion } from '@react-native-firebase/firestore';
import {
    addLocation,
    updateLocation,
    removeMediaReferenceFromLocation,
} from '../../services/firebase/locations';
import { SeverityLevel } from '../../types/severity';
import { CATEGORY_OPTIONS } from '../../constants';

export interface UsePopupSheetProps {
    mode: 'view' | 'add';
    location?: LocationData;
    onClose: () => void;
    onChange: (index: number) => void;
}

export function usePopupSheet({ mode, location, onClose, onChange }: UsePopupSheetProps) {
    const {
        selectedLocation: contextSelectedLocation,
        setSelectedLocation,
        firestoreLocationMetadata,
        setFirestoreLocationMetadata,
        reloadAllLocations,
    } = useLocationContext();

    const {
        setShowAddDataPopup,
        setIsAddingLocation,
        isAddingLocation,
        isPinPlacementMode,
        setIsPinPlacementMode,
        categoryFilter,
    } = useMapUI();

    const { user } = useAuth();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [newLocationName, setNewLocationName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number>(0);
    const [uploadCategory, setUploadCategory] = useState<number>(0);
    const [uploadedMedia, setUploadedMedia] = useState<
        Array<{ path: string; type: 'image' | 'pdf' | 'video' }>
    >([]);
    const [locationMedia, setLocationMedia] = useState<Media[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mediaCache, setMediaCache] = useState<{ [key: string]: Media[] }>({});
    const [visibleMediaCount, setVisibleMediaCount] = useState(4);
    const [modalMedia, setModalMedia] = useState<Media | null>(null);

    const visibleMedia = locationMedia.slice(0, visibleMediaCount);
    const hasMoreMedia = locationMedia.length > visibleMediaCount;

    useEffect(() => {
        if (mode === 'add') {
            setUploadCategory(categoryFilter);
            if (location) {
                setNewLocationName(location.name);
                setSelectedLocation(location);
                setFirestoreLocationMetadata({
                    id: location.id, name: location.name,
                    latitude: location.coordinates.latitude, longitude: location.coordinates.longitude,
                    description: location.accessibilityDetails || '', images: location.galleryImages || [],
                });
            } else if (!contextSelectedLocation) {
                setNewLocationName(''); setSelectedLocation(null); setFirestoreLocationMetadata(null);
            }
        } else if (mode === 'view') {
            setSelectedCategory(categoryFilter);
            if (location && contextSelectedLocation?.id !== location.id) setSelectedLocation(location);
        }
    }, [mode, categoryFilter, location, setSelectedLocation, setFirestoreLocationMetadata, contextSelectedLocation]);

    useEffect(() => {
        const fetchCategoryMedia = async () => {
            if (mode !== 'view' || !location?.id || selectedCategory === null) return;
            const categoryName = CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.label || 'Unknown';
            const cacheKey = `${location.id}-${categoryName}`;
            if (mediaCache[cacheKey]) { setLocationMedia(mediaCache[cacheKey]); return; }
            try {
                const media = await getLocationMediaByCategory(location.id, categoryName);
                setLocationMedia(media);
                setMediaCache(prev => ({ ...prev, [cacheKey]: media }));
            } catch (error) { console.error('Error fetching category media:', error); }
        };
        fetchCategoryMedia();
    }, [mode, location?.id, selectedCategory, mediaCache]);

    const handleSheetChanges = useCallback((newIndex: number) => onChange(newIndex), [onChange]);
    const handleMediaSelected = (media: { path: string; type: 'image' | 'pdf' | 'video' }) => setUploadedMedia(prev => [...prev, media]);
    const handleCategorySelect = (value: string | number | null) => { setSelectedCategory(Number(value)); setVisibleMediaCount(4); };
    const handleUploadCategorySelect = (value: string | number | null) => setUploadCategory(Number(value));

    const handleSelectLocation = (searchedLocation: LocationData) => {
        setSelectedLocation(searchedLocation);
        setFirestoreLocationMetadata({
            id: searchedLocation.id, name: searchedLocation.name,
            latitude: searchedLocation.coordinates.latitude, longitude: searchedLocation.coordinates.longitude,
            description: searchedLocation.accessibilityDetails || '', images: searchedLocation.galleryImages || [],
        });
        setNewLocationName(searchedLocation.name);
        if (isPinPlacementMode) setIsPinPlacementMode(false);
    };

    const handlePlacePinOnMap = useCallback(() => {
        if (contextSelectedLocation && !contextSelectedLocation.id.startsWith('temp-')) {
            setNewLocationName(''); setSelectedLocation(null); setFirestoreLocationMetadata(null);
        }
        setIsPinPlacementMode(true); setIsAddingLocation(true);
        bottomSheetRef.current?.snapToIndex(0);
    }, [setIsPinPlacementMode, setIsAddingLocation, contextSelectedLocation, setSelectedLocation, setFirestoreLocationMetadata]);

    const handleLocationNameChange = useCallback((text: string) => {
        setNewLocationName(text);
        setFirestoreLocationMetadata({ ...(firestoreLocationMetadata || {}), name: text });
        if (contextSelectedLocation && !contextSelectedLocation.id.startsWith('temp-') && text !== contextSelectedLocation.name) {
            setSelectedLocation(null);
        }
    }, [setFirestoreLocationMetadata, contextSelectedLocation, setSelectedLocation]);

    const handleSubmit = useCallback(async () => {
        if (isSubmitting) return;
        if (!newLocationName.trim()) { Alert.alert('Error', 'Please enter a location name'); return; }
        if (!firestoreLocationMetadata?.latitude || !firestoreLocationMetadata?.longitude) {
            Alert.alert('Error', 'Please place a pin on the map to set location coordinates'); return;
        }
        if (uploadedMedia.length === 0) { Alert.alert('Error', 'Please upload at least one media file'); return; }
        setIsSubmitting(true);
        try {
            let locationId: string;
            let existingCategories: LocationData['categories'] = {};
            if (contextSelectedLocation && !contextSelectedLocation.id.startsWith('temp-')) {
                locationId = contextSelectedLocation.id;
                existingCategories = contextSelectedLocation.categories || {};
            } else {
                const newLocationData: Partial<AccessibilityLocation> = {
                    name: newLocationName.trim(), latitude: firestoreLocationMetadata.latitude,
                    longitude: firestoreLocationMetadata.longitude, createdAt: Date.now(), categories: {}, images: [],
                };
                const savedLocation = await addLocation(newLocationData);
                if (!savedLocation?.id) throw new Error('Failed to create location: No ID returned.');
                locationId = savedLocation.id;
            }
            const categoryName = CATEGORY_OPTIONS[uploadCategory].label;
            const uploadedResults = await Promise.all(uploadedMedia.map(m => uploadMedia(m.path, locationId, categoryName, m.type)));
            const newMediaEntries: Media[] = uploadedResults.map(r => ({ url: r.url, path: r.path, type: r.type, name: r.name }));
            await updateLocation(locationId, {
                categories: { ...existingCategories, [categoryName]: { severity: 'unknown_accessibility' as SeverityLevel } },
                images: arrayUnion(...newMediaEntries),
            });
            Alert.alert('Success', 'Data saved successfully!');
            const cacheKey = `${locationId}-${categoryName}`;
            setMediaCache(prev => { const next = { ...prev }; delete next[cacheKey]; return next; });
            setLocationMedia([]); setIsAddingLocation(false); setIsPinPlacementMode(false);
            setNewLocationName(''); setUploadedMedia([]); onClose(); reloadAllLocations();
        } catch (error) {
            console.error('Error saving location and media:', error);
            Alert.alert('Error', 'Failed to save location and media. Please try again.');
        } finally { setIsSubmitting(false); }
    }, [isSubmitting, newLocationName, firestoreLocationMetadata, uploadedMedia, uploadCategory, contextSelectedLocation, setIsAddingLocation, onClose, reloadAllLocations, setIsPinPlacementMode]);

    const openGoogleMaps = useCallback(() => { if (location?.googleMapsUrl) Linking.openURL(location.googleMapsUrl); }, [location?.googleMapsUrl]);

    const handleAddDataPress = useCallback(() => {
        if (location) { setSelectedLocation(location as LocationData); setShowAddDataPopup(true); }
    }, [location, setSelectedLocation, setShowAddDataPopup]);

    const handleClose = useCallback(() => {
        if (isPinPlacementMode || isAddingLocation) { setIsPinPlacementMode(false); setIsAddingLocation(false); } else { onClose(); }
    }, [isPinPlacementMode, isAddingLocation, setIsPinPlacementMode, setIsAddingLocation, onClose]);

    const handleLoadMoreMedia = () => setVisibleMediaCount(prev => prev + 4);
    const handleImagePress = (index: number) => setModalMedia(locationMedia[index]);
    const closeModal = () => setModalMedia(null);

    const handleDeleteMedia = async () => {
        if (!modalMedia || !location || !user?.isAdmin) { Alert.alert('Permission Denied', 'You must be an admin to delete media.'); return; }
        Alert.alert('Delete Media', 'Are you sure you want to delete this media item?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deleteMediaFromStorage(modalMedia.path);
                        if (location.id) await removeMediaReferenceFromLocation(location.id, modalMedia);
                        Alert.alert('Success', 'Media deleted successfully.');
                        setModalMedia(null);
                        const categoryName = CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.label || 'Unknown';
                        const cacheKey = `${location.id}-${categoryName}`;
                        setMediaCache(prev => { const next = { ...prev }; delete next[cacheKey]; return next; });
                        setLocationMedia([]); reloadAllLocations();
                    } catch (error) { console.error('Error deleting media:', error); Alert.alert('Error', 'Failed to delete media. Please try again.'); }
                }
            },
        ]);
    };

    return {
        bottomSheetRef, newLocationName, selectedCategory, uploadCategory, uploadedMedia,
        locationMedia, isSubmitting, visibleMedia, hasMoreMedia, modalMedia,
        contextSelectedLocation, firestoreLocationMetadata, isPinPlacementMode, isAddingLocation, user,
        handleSheetChanges, handleMediaSelected, handleCategorySelect, handleUploadCategorySelect,
        handleSelectLocation, handlePlacePinOnMap, handleLocationNameChange, handleSubmit,
        openGoogleMaps, handleAddDataPress, handleClose, handleLoadMoreMedia,
        handleImagePress, closeModal, handleDeleteMedia,
    };
}
