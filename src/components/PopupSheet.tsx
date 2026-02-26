import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LocationData } from '../types/location';
import SearchBar from './SearchBar';
import { useLocationContext } from '../services/LocationContext';
import { useMapUI } from '../services/MapUIContext';
import MediaUploader from './MediaUploader';
import MediaViewer from './MediaViewer';
import {
  uploadMedia,
  getLocationMediaByCategory,
  deleteMediaFromStorage,
} from '../services/firebase/storage';
import firestore from '@react-native-firebase/firestore';
import {
  addLocation,
  updateLocation,
  removeMediaReferenceFromLocation,
} from '../services/firebase/firestore';
import { SeverityLevel } from '../types/severity';
import { BOTTOM_SHEET_SNAP_POINTS, CATEGORY_OPTIONS } from '../constants';
import GalleryGrid from './GalleryGrid';
import { AccessibilityLocation, Media } from '../types/accessibility';
import { useColors } from '../hooks/useColors';
import { useWindowDimensions } from 'react-native';
import DropdownSelector from './DropdownSelector';
import { useAuth } from '../services/AuthContext';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

interface PopupSheetProps {
  mode: 'view' | 'add';
  location?: LocationData;
  onClose: () => void;
  index: number;
  onChange: (index: number) => void;
  initialCategory?: number | null;
}

function PopupSheet({
  mode,
  location,
  onClose,
  index,
  onChange,
}: PopupSheetProps) {
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
  const colors = useColors();
  const { height } = useWindowDimensions();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  const [newLocationName, setNewLocationName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [uploadCategory, setUploadCategory] = useState<number>(0);
  const [uploadedMedia, setUploadedMedia] = useState<
    Array<{
      path: string;
      type: 'image' | 'pdf' | 'video';
    }>
  >([]);
  const [locationMedia, setLocationMedia] = useState<Media[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaCache, setMediaCache] = useState<{
    [key: string]: Media[];
  }>({});

  const [visibleMediaCount, setVisibleMediaCount] = useState(4);
  const [modalMedia, setModalMedia] = useState<Media | null>(null);

  useEffect(() => {
    if (mode === 'add') {
      setUploadCategory(categoryFilter);

      if (location) {
        // Scenario 1: Opened from 'view' popup to add data for an existing location.
        // Pre-fill everything from the existing location.
        setNewLocationName(location.name);
        setSelectedLocation(location);
        setFirestoreLocationMetadata({
          id: location.id,
          name: location.name,
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
          description: location.accessibilityDetails || '',
          images: location.galleryImages || [],
        });
      } else if (!contextSelectedLocation) {
        // Scenario 2: Opened from main 'Add Data' button, AND no temporary pin or existing location
        // is currently selected in the global context. This is a truly fresh start.
        // Only clear newLocationName if there's genuinely no selected location.
        setNewLocationName('');
        setSelectedLocation(null);
        setFirestoreLocationMetadata(null);
      }
      // Scenario 3 (Implicit): If mode is 'add' AND 'location' prop is NOT present
      // AND 'contextSelectedLocation' IS a temporary pin.
      // In this case, we DO NOT clear 'newLocationName'. It retains any user-typed value
      // which should have been saved to firestoreLocationMetadata via handleLocationNameChange.
      // The 'contextSelectedLocation' and 'firestoreLocationMetadata' are already correctly set
      // by the MapScreen's pin placement logic.
    } else if (mode === 'view') {
      setSelectedCategory(categoryFilter);
      // Ensure the context's selectedLocation matches the prop for 'view' mode, if needed.
      if (location && contextSelectedLocation?.id !== location.id) {
        setSelectedLocation(location);
      }
    }
  }, [
    mode,
    categoryFilter,
    location,
    setSelectedLocation,
    setFirestoreLocationMetadata,
    contextSelectedLocation,
  ]);

  useEffect(() => {
    const fetchCategoryMedia = async () => {
      if (mode !== 'view' || !location?.id || selectedCategory === null) {
        return;
      }

      const categoryName =
        CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.label ||
        'Unknown';
      const cacheKey = `${location.id}-${categoryName}`;

      if (mediaCache[cacheKey]) {
        setLocationMedia(mediaCache[cacheKey]);
        return;
      }

      try {
        const media = await getLocationMediaByCategory(
          location.id,
          categoryName,
        );
        console.log(`Fetched media for category ${categoryName}:`, media);
        setLocationMedia(media);
        setMediaCache(prevCache => ({ ...prevCache, [cacheKey]: media }));
      } catch (error) {
        console.error('Error fetching category media:', error);
      }
    };

    fetchCategoryMedia();
  }, [mode, location?.id, selectedCategory, mediaCache]);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleSheetChanges = useCallback(
    (newIndex: number) => {
      console.log('handleSheetChanges popup', newIndex);
      onChange(newIndex);
    },
    [onChange],
  );

  const handleMediaSelected = (media: {
    path: string;
    type: 'image' | 'pdf' | 'video';
  }) => {
    setUploadedMedia(prev => [...prev, media]);
  };

  const handleCategorySelect = (value: string | number | null) => {
    setSelectedCategory(Number(value));
    setVisibleMediaCount(4);
  };

  const handleUploadCategorySelect = (value: string | number | null) => {
    setUploadCategory(Number(value));
  };

  const handleSelectLocation = (searchedLocation: LocationData) => {
    console.log('Selected location from search:', searchedLocation.name);

    if (contextSelectedLocation?.id.startsWith('temp-')) {
      console.log('Replacing pinned location with searched location');
    }

    setSelectedLocation(searchedLocation);

    const firestoreMetadata: Partial<AccessibilityLocation> = {
      id: searchedLocation.id,
      name: searchedLocation.name,
      latitude: searchedLocation.coordinates.latitude,
      longitude: searchedLocation.coordinates.longitude,
      description: searchedLocation.accessibilityDetails || '',
      images: searchedLocation.galleryImages || [],
    };

    setFirestoreLocationMetadata(firestoreMetadata);
    setNewLocationName(searchedLocation.name);

    if (isPinPlacementMode) {
      setIsPinPlacementMode(false);
    }
  };

  const handlePlacePinOnMap = useCallback(() => {
    if (
      contextSelectedLocation &&
      !contextSelectedLocation.id.startsWith('temp-')
    ) {
      console.log(
        'Clearing search bar because an existing location was selected before pinning.',
      );
      setNewLocationName('');
      setSelectedLocation(null);
      setFirestoreLocationMetadata(null);
    }

    setIsPinPlacementMode(true);
    setIsAddingLocation(true);

    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0);
    }
  }, [
    setIsPinPlacementMode,
    setIsAddingLocation,
    contextSelectedLocation,
    setSelectedLocation,
    setFirestoreLocationMetadata,
  ]);

  const handleLocationNameChange = useCallback(
    (text: string) => {
      setNewLocationName(text);

      // CRITICAL FIX: Always update firestoreLocationMetadata with the current name.
      // This ensures that when setNewPinnedLocation is called, it correctly
      // picks up the latest typed name, preventing it from being cleared.
      setFirestoreLocationMetadata({
        ...(firestoreLocationMetadata || {}),
        name: text,
      });

      // This part handles detaching from an *existing* selected location if its name is changed.
      // It's separate from preserving the typed name for new pins.
      if (
        contextSelectedLocation &&
        !contextSelectedLocation.id.startsWith('temp-') &&
        text !== contextSelectedLocation.name
      ) {
        console.log('Detaching from existing location due to name change.');
        setSelectedLocation(null);
        // Do NOT set firestoreLocationMetadata to null here. It should contain the new name.
      }
    },
    [
      setFirestoreLocationMetadata, // Important dependency for this useCallback
      contextSelectedLocation,
      setSelectedLocation,
    ],
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    console.log('Auth user in handleSubmit:', user);
    console.log('Auth user UID in handleSubmit:', user?.uid);

    if (!newLocationName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }

    if (
      !firestoreLocationMetadata?.latitude ||
      !firestoreLocationMetadata?.longitude
    ) {
      Alert.alert(
        'Error',
        'Please place a pin on the map to set location coordinates',
      );
      return;
    }

    if (uploadedMedia.length === 0) {
      Alert.alert('Error', 'Please upload at least one media file');
      return;
    }

    setIsSubmitting(true);

    try {
      let locationId: string;
      let existingCategories: LocationData['categories'] = {};

      if (
        contextSelectedLocation &&
        !contextSelectedLocation.id.startsWith('temp-')
      ) {
        locationId = contextSelectedLocation.id;
        existingCategories = contextSelectedLocation.categories || {};
        console.log('Will update existing location:', locationId);
      } else {
        console.log('Will create new location');
        const newLocationData: Partial<AccessibilityLocation> = {
          name: newLocationName.trim(),
          latitude: firestoreLocationMetadata.latitude,
          longitude: firestoreLocationMetadata.longitude,
          createdAt: Date.now(),
          categories: {},
          images: [],
        };
        const savedLocation = await addLocation(newLocationData);
        if (!savedLocation?.id) {
          throw new Error('Failed to create location: No ID returned.');
        }
        locationId = savedLocation.id;
        console.log('New location created with ID:', locationId);
      }

      const categoryName = CATEGORY_OPTIONS[uploadCategory].label;
      const newCategoryData = {
        severity: 'unknown_accessibility' as SeverityLevel,
      };

      const uploadedMediaResults = await Promise.all(
        uploadedMedia.map(media =>
          uploadMedia(media.path, locationId, categoryName, media.type),
        ),
      );
      console.log('All media uploaded successfully.');

      const newMediaEntries: Media[] = uploadedMediaResults.map(result => ({
        url: result.url,
        path: result.path,
        type: result.type,
        name: result.name,
      }));

      const finalCategoriesUpdate = {
        ...existingCategories,
        [categoryName]: newCategoryData,
      };

      const finalImagesUpdate = firestore.FieldValue.arrayUnion(
        ...newMediaEntries,
      );

      await updateLocation(locationId, {
        categories: finalCategoriesUpdate,
        images: finalImagesUpdate,
      });
      console.log(`Updated categories and images for location ${locationId}.`);

      Alert.alert('Success', 'Data saved successfully!');

      const updatedLocationId = locationId;
      const updatedCategoryName = CATEGORY_OPTIONS[uploadCategory].label;
      const updatedCacheKey = `${updatedLocationId}-${updatedCategoryName}`;
      setMediaCache(prevCache => {
        const newCache = { ...prevCache };
        delete newCache[updatedCacheKey];
        return newCache;
      });
      setLocationMedia([]);
      setIsAddingLocation(false);
      setIsPinPlacementMode(false);
      setNewLocationName('');
      setUploadedMedia([]);
      onClose();
      reloadAllLocations();
    } catch (error) {
      console.error('Error saving location and media:', error);
      Alert.alert(
        'Error',
        'Failed to save location and media. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    newLocationName,
    firestoreLocationMetadata,
    uploadedMedia,
    uploadCategory,
    contextSelectedLocation,
    setIsAddingLocation,
    onClose,
    reloadAllLocations,
    user,
    setIsPinPlacementMode,
  ]);

  const openGoogleMaps = useCallback(() => {
    if (location?.googleMapsUrl) {
      console.log('Opening Google Maps:', location.googleMapsUrl);
      Linking.openURL(location.googleMapsUrl);
    }
  }, [location?.googleMapsUrl]);

  const handleAddDataPress = useCallback(() => {
    if (location) {
      const locationWithCategory = {
        ...location,
      };
      setSelectedLocation(locationWithCategory as LocationData);
      setShowAddDataPopup(true);
    }
  }, [location, setSelectedLocation, setShowAddDataPopup]);

  const handleClose = useCallback(() => {
    if (isPinPlacementMode || isAddingLocation) {
      setIsPinPlacementMode(false);
      setIsAddingLocation(false);
    } else {
      onClose();
    }
  }, [
    isPinPlacementMode,
    isAddingLocation,
    setIsPinPlacementMode,
    setIsAddingLocation,
    onClose,
  ]);

  const handleLoadMoreMedia = () => {
    setVisibleMediaCount(prevCount => prevCount + 4);
  };

  const handleImagePress = (index: number) => {
    setModalMedia(locationMedia[index]);
  };

  const closeModal = () => {
    setModalMedia(null);
  };

  const handleDeleteMedia = async () => {
    if (!modalMedia || !location || !user?.isAdmin) {
      Alert.alert('Permission Denied', 'You must be an admin to delete media.');
      return;
    }

    Alert.alert(
      'Delete Media',
      'Are you sure you want to delete this media item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(
                'Attempting to delete from Storage:',
                modalMedia.path,
              );
              await deleteMediaFromStorage(modalMedia.path);
              console.log('Media deleted from Storage:', modalMedia.path);

              if (location.id) {
                console.log(
                  'Attempting to remove media reference from Firestore:',
                  modalMedia,
                );
                await removeMediaReferenceFromLocation(location.id, modalMedia);
                console.log('Media reference removed from Firestore.');
              }

              Alert.alert('Success', 'Media deleted successfully.');
              setModalMedia(null);

              const categoryName =
                CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.label ||
                'Unknown';
              const cacheKey = `${location.id}-${categoryName}`;
              setMediaCache(prevCache => {
                const newCache = { ...prevCache };
                delete newCache[cacheKey];
                return newCache;
              });

              setLocationMedia([]);
              reloadAllLocations();
            } catch (error) {
              console.error('Error deleting media:', error);
              Alert.alert(
                'Error',
                'Failed to delete media. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const visibleMedia = locationMedia.slice(0, visibleMediaCount);
  const hasMoreMedia = locationMedia.length > visibleMediaCount;

  const dynamicStyles = StyleSheet.create({
    bottomSheet: {
      zIndex: 1000,
    },
    container: {
      flex: 1,
    },
    contentContainer: {
      padding: proportionalSize(16),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: scaleHeight(16),
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationName: {
      fontSize: scaleFont(18),
      fontWeight: 'bold',
      flex: 1,
      marginRight: scaleWidth(8),
      color: colors.textPrimary,
    },
    searchHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: scaleFont(20),
      fontWeight: 'bold',
      flex: 1,
      color: colors.textPrimary,
    },
    addDataButton: {
      backgroundColor: colors.secondary,
      paddingVertical: scaleHeight(6),
      paddingHorizontal: scaleWidth(12),
      borderRadius: proportionalSize(8),
      marginRight: scaleWidth(8),
    },
    addDataButtonText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(14),
    },
    mapButton: {
      backgroundColor: colors.primary,
      paddingVertical: scaleHeight(6),
      paddingHorizontal: scaleWidth(12),
      borderRadius: proportionalSize(8),
      marginRight: scaleWidth(8),
    },
    mapButtonText: {
      color: colors.textInverse,
      fontSize: scaleFont(14),
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
    },
    input: {
      borderWidth: proportionalSize(1),
      borderColor: colors.border,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(12),
      fontSize: scaleFont(16),
      backgroundColor: colors.backgroundSecondary,
      marginBottom: scaleHeight(16),
      color: colors.textPrimary,
    },
    textArea: {
      height: scaleHeight(100),
      paddingTop: scaleHeight(12),
    },
    searchPlaceholder: {
      height: scaleHeight(48),
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: scaleHeight(16),
    },
    placeholderText: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
    },
    accessibilityDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: scaleHeight(8),
    },
    detailText: {
      fontSize: scaleFont(14),
      lineHeight: scaleFont(20),
      marginBottom: scaleHeight(4),
      flex: 1,
      paddingRight: scaleWidth(16),
      color: colors.textPrimary,
    },
    highlightText: {
      fontWeight: 'bold',
    },
    circle: {
      width: scaleWidth(40),
      height: scaleHeight(40),
      borderRadius: proportionalSize(20),
    },
    largeCircle: {
      width: scaleWidth(50),
      height: scaleHeight(50),
      borderRadius: proportionalSize(25),
    },
    placePin: {
      backgroundColor: colors.backgroundSecondary,
      padding: proportionalSize(16),
      borderRadius: proportionalSize(8),
      alignItems: 'center',
      marginVertical: scaleHeight(16),
      borderWidth: proportionalSize(1),
      borderColor: colors.border,
    },
    placePinActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    placePinText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    placePinTextActive: {
      color: colors.primary,
      fontWeight: 'bold',
    },
    uploadPlaceholder: {
      height: scaleHeight(80),
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: scaleHeight(12),
      borderWidth: proportionalSize(1),
      borderStyle: 'dashed',
      borderColor: colors.primary,
    },
    uploadedMediaContainer: {
      marginTop: scaleHeight(16),
    },
    mediaGallery: {
      marginTop: scaleHeight(16),
    },
    mediaItem: {
      marginBottom: scaleHeight(8),
      borderRadius: proportionalSize(8),
      overflow: 'hidden',
    },
    mediaPreview: {
      width: '100%',
      height: scaleHeight(120),
      borderRadius: proportionalSize(8),
    },
    uploadMediaOnlyButton: {
      backgroundColor: colors.accent,
      padding: proportionalSize(12),
      borderRadius: proportionalSize(8),
      alignItems: 'center',
      marginVertical: scaleHeight(12),
    },
    uploadMediaOnlyButtonText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    mediaName: {
      fontSize: scaleFont(12),
      color: colors.textPrimary,
      marginTop: scaleHeight(4),
      textAlign: 'center',
    },
    noMediaText: {
      color: colors.textPrimary,
      marginTop: scaleHeight(8),
      textAlign: 'center',
      fontStyle: 'italic',
      fontSize: scaleFont(14),
    },
    coordinatesContainer: {
      backgroundColor: colors.secondaryLight,
      padding: proportionalSize(8),
      borderRadius: proportionalSize(6),
      marginVertical: scaleHeight(8),
    },
    coordinatesText: {
      fontSize: scaleFont(12),
      color: colors.secondaryDark,
      textAlign: 'center',
    },
    mediaPreviewContainer: {
      marginTop: scaleHeight(16),
    },
    mediaPreviewItem: {
      marginBottom: scaleHeight(8),
      borderRadius: proportionalSize(8),
      overflow: 'hidden',
    },
    loadMoreButton: {
      backgroundColor: colors.gray100,
      padding: proportionalSize(12),
      borderRadius: proportionalSize(8),
      alignItems: 'center',
      marginVertical: scaleHeight(16),
    },
    loadMoreText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlay,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
      backgroundColor: colors.background,
      padding: proportionalSize(20),
      borderRadius: proportionalSize(16),
      width: '90%',
      maxHeight: '80%',
      alignItems: 'center',
    },
    modalButtonsContainer: {
      flexDirection: 'row',
      marginTop: scaleHeight(20),
      justifyContent: 'space-between',
      width: '100%',
      paddingHorizontal: proportionalSize(0),
    },
    commonModalButtonBase: {
      paddingVertical: scaleHeight(10),
      paddingHorizontal: scaleWidth(15),
      borderRadius: proportionalSize(8),
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: scaleWidth(90),
      flexGrow: 1,
      marginHorizontal: scaleWidth(4),
    },
    closeModalButton: {
      backgroundColor: colors.primary,
    },
    closeModalText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    downloadButton: {
      backgroundColor: colors.secondary,
    },
    downloadButtonText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    deleteModalButton: {
      backgroundColor: colors.error,
    },
    deleteModalText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    video: {
      width: '100%',
      height: scaleHeight(300),
    },
    pdfContainer: {
      width: '100%',
      height: height * 0.6,
    },
    closeButton: {
      paddingVertical: scaleHeight(6),
      paddingHorizontal: scaleWidth(12),
      borderRadius: proportionalSize(10),
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: scaleFont(14),
      fontWeight: 'bold',
      color: colors.textInverse,
    },
    submitButton: {
      padding: proportionalSize(12),
      borderRadius: proportionalSize(8),
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scaleHeight(16),
    },
    submitButtonText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    sectionTitle: {
      fontSize: scaleFont(16),
      fontWeight: '600',
      marginTop: scaleHeight(16),
      marginBottom: scaleHeight(8),
      color: colors.textPrimary,
    },
  });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={index}
      snapPoints={BOTTOM_SHEET_SNAP_POINTS}
      onChange={handleSheetChanges}
      backgroundStyle={{
        backgroundColor: colors.background,
        borderTopLeftRadius: proportionalSize(24),
        borderTopRightRadius: proportionalSize(24),
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.gray300,
        width: scaleWidth(40),
      }}
      enablePanDownToClose={false}
      style={dynamicStyles.bottomSheet}
    >
      <BottomSheetScrollView
        style={dynamicStyles.container}
        contentContainerStyle={dynamicStyles.contentContainer}
      >
        {mode === 'view' && (
          <View style={dynamicStyles.header}>
            <Text
              style={dynamicStyles.locationName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {location?.name || 'Location'}
            </Text>
            <View style={dynamicStyles.headerButtons}>
              <TouchableOpacity
                style={dynamicStyles.addDataButton}
                onPress={handleAddDataPress}
              >
                <Text style={dynamicStyles.addDataButtonText}>Add Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={dynamicStyles.mapButton}
                onPress={openGoogleMaps}
              >
                <Text style={dynamicStyles.mapButtonText}>Maps</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={dynamicStyles.closeButton}
                onPress={handleClose}
              >
                <Text style={dynamicStyles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={dynamicStyles.content}>
          {mode === 'add' && (
            <>
              <View style={dynamicStyles.searchHeaderContainer}>
                <Text style={[dynamicStyles.sectionTitle]}>Location Name</Text>
                <TouchableOpacity
                  style={dynamicStyles.closeButton}
                  onPress={handleClose}
                >
                  <Text style={dynamicStyles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
              <SearchBar
                onSelectLocation={handleSelectLocation}
                placeholder="Search for a location or enter new name"
                initialValue={newLocationName}
                showResults={true}
                onTextChange={handleLocationNameChange}
              />
            </>
          )}

          <DropdownSelector
            title="Filter by Category"
            options={CATEGORY_OPTIONS.map(cat => ({
              label: cat.label,
              value: cat.id,
              icon: cat.icon,
            }))}
            selectedValue={mode === 'add' ? uploadCategory : selectedCategory}
            onValueChange={
              mode === 'add' ? handleUploadCategorySelect : handleCategorySelect
            }
            placeholder="Select a category..."
            buttonBackgroundColor={colors.primary}
            buttonTextColor={colors.textInverse}
          />

          {mode === 'view' ? (
            <>
              <Text style={[dynamicStyles.sectionTitle]}>
                Accessibility Details
              </Text>
              <View style={dynamicStyles.accessibilityDetails}>
                <Text style={dynamicStyles.detailText}>
                  {location?.accessibilityDetails ||
                    'No details available for this category.'}
                </Text>
                <View
                  style={[
                    dynamicStyles.circle,
                    dynamicStyles.largeCircle,
                    {
                      backgroundColor:
                        colors[
                        location?.severityColor || 'unknownAccessibility'
                        ],
                    },
                  ]}
                />
              </View>

              {location?.analysis && (
                <Text style={dynamicStyles.detailText}>
                  {location.analysis}
                </Text>
              )}

              {location?.chatOption && (
                <Text style={dynamicStyles.detailText}>
                  Maybe an option to chat w the model
                </Text>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  dynamicStyles.placePin,
                  isPinPlacementMode && dynamicStyles.placePinActive,
                ]}
                onPress={handlePlacePinOnMap}
              >
                <Text
                  style={[
                    dynamicStyles.placePinText,
                    isPinPlacementMode && dynamicStyles.placePinTextActive,
                  ]}
                >
                  {isPinPlacementMode
                    ? 'Select Location on Map'
                    : contextSelectedLocation?.id.startsWith('temp-')
                      ? 'Pin Placed - Tap to Change'
                      : 'Place Pin on Map'}
                </Text>
              </TouchableOpacity>

              {firestoreLocationMetadata?.latitude &&
                firestoreLocationMetadata?.longitude && (
                  <View style={dynamicStyles.coordinatesContainer}>
                    <Text style={dynamicStyles.coordinatesText}>
                      📍 {firestoreLocationMetadata.latitude.toFixed(6)},{' '}
                      {firestoreLocationMetadata.longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
            </>
          )}

          {mode === 'view' && locationMedia.length > 0 ? (
            <>
              <Text style={[dynamicStyles.sectionTitle]}>Media</Text>
              <GalleryGrid
                media={visibleMedia.map(item => ({
                  url: item.url,
                  type: item.type,
                }))}
                onImagePress={handleImagePress}
              />
              {hasMoreMedia && (
                <TouchableOpacity
                  style={dynamicStyles.loadMoreButton}
                  onPress={handleLoadMoreMedia}
                >
                  <Text style={dynamicStyles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            mode === 'view' && (
              <>
                <Text style={[dynamicStyles.sectionTitle]}>Media</Text>
                <Text style={dynamicStyles.noMediaText}>
                  No media files found for this location.
                </Text>
              </>
            )
          )}

          {mode === 'add' && (
            <>
              <Text style={[dynamicStyles.sectionTitle]}>Add Media</Text>
              <MediaUploader onMediaSelected={handleMediaSelected} />

              <View style={dynamicStyles.mediaPreviewContainer}>
                {uploadedMedia.map((mediaItem, index) => (
                  <View key={index} style={dynamicStyles.mediaPreviewItem}>
                    <MediaViewer
                      source={mediaItem.path}
                      type={mediaItem.type}
                      style={dynamicStyles.mediaPreview}
                    />
                    {mediaItem.path && (
                      <Text style={dynamicStyles.mediaName}>
                        {mediaItem.path.split('/').pop()}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  dynamicStyles.submitButton,
                  {
                    backgroundColor: isSubmitting
                      ? colors.gray300
                      : colors.primary,
                  },
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={dynamicStyles.submitButtonText}>
                  {isSubmitting ? 'Saving...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </BottomSheetScrollView>

      <Modal
        visible={!!modalMedia}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={dynamicStyles.modalContainer}>
          <TouchableOpacity
            style={dynamicStyles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModal}
          />
          <View style={dynamicStyles.modalContent}>
            {modalMedia && (
              <MediaViewer source={modalMedia.url} type={modalMedia.type} />
            )}
            <View style={dynamicStyles.modalButtonsContainer}>
              {(modalMedia?.type === 'pdf' ||
                modalMedia?.type === 'image' ||
                modalMedia?.type === 'video') && (
                  <TouchableOpacity
                    style={[
                      dynamicStyles.downloadButton,
                      dynamicStyles.commonModalButtonBase,
                    ]}
                    onPress={() => Linking.openURL(modalMedia.url)}
                  >
                    <Text style={dynamicStyles.downloadButtonText}>Download</Text>
                  </TouchableOpacity>
                )}
              <TouchableOpacity
                style={[
                  dynamicStyles.closeModalButton,
                  dynamicStyles.commonModalButtonBase,
                ]}
                onPress={closeModal}
              >
                <Text style={dynamicStyles.closeModalText}>Close</Text>
              </TouchableOpacity>
              {user?.isAdmin && modalMedia && (
                <TouchableOpacity
                  style={[
                    dynamicStyles.deleteModalButton,
                    dynamicStyles.commonModalButtonBase,
                  ]}
                  onPress={handleDeleteMedia}
                >
                  <Text style={dynamicStyles.deleteModalText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </BottomSheet>
  );
}

export default PopupSheet;
