/**
 * usePopupSheet — all state, effects, and handlers for PopupSheet.
 * Extracted from the component so PopupSheet.tsx is a pure render layer.
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { LocationData } from '../../types/location';
import { AccessibilityLocation, Media } from '../../types/media';
import { useMapUI } from '../../contexts/MapUIContext';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { LOCATIONS_QUERY_KEY } from '../../services/store/locationQueries';
import { useMediaByCategoryQuery, mediaQueryKey } from '../../services/store/mediaQueries';
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
import { CATEGORY_OPTIONS } from '../../config/constants';

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
        setShowAddDataPopup,
        setIsAddingLocation,
        isAddingLocation,
        isPinPlacementMode,
        setIsPinPlacementMode,
        categoryFilter,
    } = useMapUI();

    const queryClient = useQueryClient();
    const reloadAllLocations = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
    }, [queryClient]);

    const { user } = useAuth();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [newLocationName, setNewLocationName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number>(0);
    const [uploadCategory, setUploadCategory] = useState<number>(0);
    const [uploadedMedia, setUploadedMedia] = useState<
        Array<{ path: string; type: 'image' | 'pdf' | 'video' }>
    >([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visibleMediaCount, setVisibleMediaCount] = useState(4);
    const [modalMedia, setModalMedia] = useState<Media | null>(null);

    const mappedCategoryName = CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.label || 'Unknown';
    const { data: locationMedia = [], isLoading: isLoadingMedia } = useMediaByCategoryQuery(
        mode === 'view' ? location?.id : undefined,
        mode === 'view' ? mappedCategoryName : undefined
    );

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

    const savePinMutation = useMutation({
        mutationFn: async () => {
            let locationId: string;
            let existingCategories: LocationData['categories'] = {};
            if (contextSelectedLocation && !contextSelectedLocation.id.startsWith('temp-')) {
                locationId = contextSelectedLocation.id;
                existingCategories = contextSelectedLocation.categories || {};
            } else {
                const newLocationData: Partial<AccessibilityLocation> = {
                    name: newLocationName.trim(), latitude: firestoreLocationMetadata!.latitude!,
                    longitude: firestoreLocationMetadata!.longitude!, createdAt: Date.now(), categories: {}, images: [],
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
            return { locationId, categoryName };
        },
        onMutate: async () => {
            setIsSubmitting(true);
            await queryClient.cancelQueries({ queryKey: LOCATIONS_QUERY_KEY });
            const previousLocations = queryClient.getQueryData<LocationData[]>(LOCATIONS_QUERY_KEY);

            // Optimistic Pin Injection
            if (!contextSelectedLocation || contextSelectedLocation.id.startsWith('temp-')) {
                const categoryName = CATEGORY_OPTIONS[uploadCategory].label;
                const optimisticPin: LocationData = {
                    id: `temp-${Date.now()}`,
                    name: newLocationName.trim(),
                    coordinates: {
                        latitude: firestoreLocationMetadata!.latitude!,
                        longitude: firestoreLocationMetadata!.longitude!,
                    },
                    severity: 'unknown_accessibility',
                    severityColor: 'unknownAccessibility',
                    categories: {
                        [categoryName]: { severity: 'unknown_accessibility' as SeverityLevel, details: '' }
                    },
                    galleryImages: [],
                };
                queryClient.setQueryData<LocationData[]>(LOCATIONS_QUERY_KEY, old => old ? [...old, optimisticPin] : [optimisticPin]);
            }
            return { previousLocations };
        },
        onError: (err, newLocation, context) => {
            console.error('Error saving location and media:', err);
            Alert.alert('Error', 'Failed to save location and media. Please try again.');
            if (context?.previousLocations) {
                queryClient.setQueryData(LOCATIONS_QUERY_KEY, context.previousLocations);
            }
            setIsSubmitting(false);
        },
        onSuccess: ({ locationId, categoryName }) => {
            Alert.alert('Success', 'Data saved successfully!');
            queryClient.invalidateQueries({ queryKey: mediaQueryKey(locationId, categoryName) });
            queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
            setIsAddingLocation(false); setIsPinPlacementMode(false);
            setNewLocationName(''); setUploadedMedia([]); onClose();
            setIsSubmitting(false);
        },
    });

    const handleSubmit = useCallback(() => {
        if (isSubmitting) return;
        if (!newLocationName.trim()) { Alert.alert('Error', 'Please enter a location name'); return; }
        if (!firestoreLocationMetadata?.latitude || !firestoreLocationMetadata?.longitude) {
            Alert.alert('Error', 'Please place a pin on the map to set location coordinates'); return;
        }
        if (uploadedMedia.length === 0) { Alert.alert('Error', 'Please upload at least one media file'); return; }

        savePinMutation.mutate();
    }, [isSubmitting, newLocationName, firestoreLocationMetadata, uploadedMedia, savePinMutation]);

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
                        queryClient.invalidateQueries({ queryKey: mediaQueryKey(location.id, categoryName) });
                        reloadAllLocations();
                    } catch (error) { console.error('Error deleting media:', error); Alert.alert('Error', 'Failed to delete media. Please try again.'); }
                }
            },
        ]);
    };

    return {
        bottomSheetRef, newLocationName, selectedCategory, uploadCategory, uploadedMedia,
        locationMedia, isLoadingMedia, isSubmitting, visibleMedia, hasMoreMedia, modalMedia,
        contextSelectedLocation, firestoreLocationMetadata, isPinPlacementMode, isAddingLocation, user,
        handleSheetChanges, handleMediaSelected, handleCategorySelect, handleUploadCategorySelect,
        handleSelectLocation, handlePlacePinOnMap, handleLocationNameChange, handleSubmit,
        openGoogleMaps, handleAddDataPress, handleClose, handleLoadMoreMedia,
        handleImagePress, closeModal, handleDeleteMedia,
    };
}
