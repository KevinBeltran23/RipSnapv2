import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Linking,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LocationData } from '../../types/location';
import SearchBar from '../common/SearchBar';
import MediaUploader from '../media/MediaUploader';
import MediaViewer from '../common/MediaViewer';
import {
    BOTTOM_SHEET_SNAP_POINTS,
    CATEGORY_OPTIONS,
} from '../../config/constants';
import GalleryGrid from '../common/GalleryGrid';
import { useColors } from '../../hooks/useColors';
import { useWindowDimensions } from 'react-native';
import DropdownSelector from '../common/DropdownSelector';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { usePopupSheet } from './usePopupSheet';

interface PopupSheetProps {
    mode: 'view' | 'add';
    location?: LocationData;
    onClose: () => void;
    index: number;
    onChange: (index: number) => void;
    initialCategory?: number | null;
}

function PopupSheet({ mode, location, onClose, index, onChange }: PopupSheetProps) {
    const colors = useColors();
    const { height } = useWindowDimensions();
    const { scaleHeight, scaleWidth, proportionalSize, scaleFont } = useResponsiveStyles();

    const {
        bottomSheetRef, newLocationName, selectedCategory, uploadCategory, uploadedMedia,
        isSubmitting, visibleMedia, hasMoreMedia, modalMedia,
        contextSelectedLocation, firestoreLocationMetadata, isPinPlacementMode, user,
        handleSheetChanges, handleMediaSelected, handleCategorySelect, handleUploadCategorySelect,
        handleSelectLocation, handlePlacePinOnMap, handleLocationNameChange, handleSubmit,
        openGoogleMaps, handleAddDataPress, handleClose, handleLoadMoreMedia,
        handleImagePress, closeModal, handleDeleteMedia,
    } = usePopupSheet({ mode, location, onClose, onChange });

    const s = StyleSheet.create({
        bottomSheet: { zIndex: 1000 },
        container: { flex: 1 },
        contentContainer: { padding: proportionalSize(16) },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleHeight(16) },
        headerButtons: { flexDirection: 'row', alignItems: 'center' },
        locationName: { fontSize: scaleFont(18), fontWeight: 'bold', flex: 1, marginRight: scaleWidth(8), color: colors.textPrimary },
        searchHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        addDataButton: { backgroundColor: colors.secondary, paddingVertical: scaleHeight(6), paddingHorizontal: scaleWidth(12), borderRadius: proportionalSize(8), marginRight: scaleWidth(8) },
        addDataButtonText: { color: colors.textInverse, fontWeight: '600', fontSize: scaleFont(14) },
        mapButton: { backgroundColor: colors.primary, paddingVertical: scaleHeight(6), paddingHorizontal: scaleWidth(12), borderRadius: proportionalSize(8), marginRight: scaleWidth(8) },
        mapButtonText: { color: colors.textInverse, fontSize: scaleFont(14), fontWeight: 'bold' },
        content: { flex: 1 },
        accessibilityDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleHeight(8) },
        detailText: { fontSize: scaleFont(14), lineHeight: scaleFont(20), marginBottom: scaleHeight(4), flex: 1, paddingRight: scaleWidth(16), color: colors.textPrimary },
        circle: { width: scaleWidth(40), height: scaleHeight(40), borderRadius: proportionalSize(20) },
        largeCircle: { width: scaleWidth(50), height: scaleHeight(50), borderRadius: proportionalSize(25) },
        placePin: { backgroundColor: colors.backgroundSecondary, padding: proportionalSize(16), borderRadius: proportionalSize(8), alignItems: 'center', marginVertical: scaleHeight(16), borderWidth: proportionalSize(1), borderColor: colors.border },
        placePinActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
        placePinText: { color: colors.primary, fontWeight: '600', fontSize: scaleFont(16) },
        placePinTextActive: { color: colors.primary, fontWeight: 'bold' },
        coordinatesContainer: { backgroundColor: colors.secondaryLight, padding: proportionalSize(8), borderRadius: proportionalSize(6), marginVertical: scaleHeight(8) },
        coordinatesText: { fontSize: scaleFont(12), color: colors.secondaryDark, textAlign: 'center' },
        mediaPreviewContainer: { marginTop: scaleHeight(16) },
        mediaPreviewItem: { marginBottom: scaleHeight(8), borderRadius: proportionalSize(8), overflow: 'hidden' },
        mediaPreview: { width: '100%', height: scaleHeight(120), borderRadius: proportionalSize(8) },
        mediaName: { fontSize: scaleFont(12), color: colors.textPrimary, marginTop: scaleHeight(4), textAlign: 'center' },
        noMediaText: { color: colors.textPrimary, marginTop: scaleHeight(8), textAlign: 'center', fontStyle: 'italic', fontSize: scaleFont(14) },
        loadMoreButton: { backgroundColor: colors.gray100, padding: proportionalSize(12), borderRadius: proportionalSize(8), alignItems: 'center', marginVertical: scaleHeight(16) },
        loadMoreText: { color: colors.primary, fontWeight: '600', fontSize: scaleFont(16) },
        submitButton: { padding: proportionalSize(12), borderRadius: proportionalSize(8), alignItems: 'center', justifyContent: 'center', marginTop: scaleHeight(16) },
        submitButtonText: { color: colors.textInverse, fontWeight: '600', fontSize: scaleFont(16) },
        sectionTitle: { fontSize: scaleFont(16), fontWeight: '600', marginTop: scaleHeight(16), marginBottom: scaleHeight(8), color: colors.textPrimary },
        modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlay },
        modalBackdrop: { ...StyleSheet.absoluteFillObject },
        modalContent: { backgroundColor: colors.background, padding: proportionalSize(20), borderRadius: proportionalSize(16), width: '90%', maxHeight: '80%', alignItems: 'center' },
        modalButtonsContainer: { flexDirection: 'row', marginTop: scaleHeight(20), justifyContent: 'space-between', width: '100%' },
        commonModalButtonBase: { paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(15), borderRadius: proportionalSize(8), alignItems: 'center', justifyContent: 'center', minWidth: scaleWidth(90), flexGrow: 1, marginHorizontal: scaleWidth(4) },
        closeModalButton: { backgroundColor: colors.primary },
        closeModalText: { color: colors.textInverse, fontWeight: '600', fontSize: scaleFont(16) },
        downloadButton: { backgroundColor: colors.secondary },
        downloadButtonText: { color: colors.textInverse, fontWeight: '600', fontSize: scaleFont(16) },
        deleteModalButton: { backgroundColor: colors.error },
        deleteModalText: { color: colors.textInverse, fontWeight: '600', fontSize: scaleFont(16) },
        closeButton: { paddingVertical: scaleHeight(6), paddingHorizontal: scaleWidth(12), borderRadius: proportionalSize(10), backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center' },
        closeButtonText: { fontSize: scaleFont(14), fontWeight: 'bold', color: colors.textInverse },
    });

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={index}
            snapPoints={BOTTOM_SHEET_SNAP_POINTS}
            onChange={handleSheetChanges}
            backgroundStyle={{ backgroundColor: colors.background, borderTopLeftRadius: proportionalSize(24), borderTopRightRadius: proportionalSize(24) }}
            handleIndicatorStyle={{ backgroundColor: colors.gray300, width: scaleWidth(40) }}
            enablePanDownToClose={false}
            style={s.bottomSheet}
        >
            <BottomSheetScrollView style={s.container} contentContainerStyle={s.contentContainer}>
                {mode === 'view' && (
                    <View style={s.header}>
                        <Text style={s.locationName} numberOfLines={1} ellipsizeMode="tail">
                            {location?.name || 'Location'}
                        </Text>
                        <View style={s.headerButtons}>
                            <TouchableOpacity style={s.addDataButton} onPress={handleAddDataPress}><Text style={s.addDataButtonText}>Add Data</Text></TouchableOpacity>
                            <TouchableOpacity style={s.mapButton} onPress={openGoogleMaps}><Text style={s.mapButtonText}>Maps</Text></TouchableOpacity>
                            <TouchableOpacity style={s.closeButton} onPress={handleClose}><Text style={s.closeButtonText}>Close</Text></TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={s.content}>
                    {mode === 'add' && (
                        <>
                            <View style={s.searchHeaderContainer}>
                                <Text style={s.sectionTitle}>Location Name</Text>
                                <TouchableOpacity style={s.closeButton} onPress={handleClose}><Text style={s.closeButtonText}>Close</Text></TouchableOpacity>
                            </View>
                            <SearchBar onSelectLocation={handleSelectLocation} placeholder="Search for a location or enter new name" initialValue={newLocationName} showResults={true} onTextChange={handleLocationNameChange} />
                        </>
                    )}

                    <DropdownSelector
                        title="Filter by Category"
                        options={CATEGORY_OPTIONS.map(cat => ({ label: cat.label, value: cat.id, icon: cat.icon }))}
                        selectedValue={mode === 'add' ? uploadCategory : selectedCategory}
                        onValueChange={mode === 'add' ? handleUploadCategorySelect : handleCategorySelect}
                        placeholder="Select a category..."
                        buttonBackgroundColor={colors.primary}
                        buttonTextColor={colors.textInverse}
                    />

                    {mode === 'view' ? (
                        <>
                            <Text style={s.sectionTitle}>Accessibility Details</Text>
                            <View style={s.accessibilityDetails}>
                                <Text style={s.detailText}>{location?.accessibilityDetails || 'No details available for this category.'}</Text>
                                <View style={[s.circle, s.largeCircle, { backgroundColor: colors[location?.severityColor || 'unknownAccessibility'] }]} />
                            </View>
                            {location?.analysis && <Text style={s.detailText}>{location.analysis}</Text>}
                            {location?.chatOption && <Text style={s.detailText}>Maybe an option to chat w the model</Text>}
                        </>
                    ) : (
                        <>
                            <TouchableOpacity style={[s.placePin, isPinPlacementMode && s.placePinActive]} onPress={handlePlacePinOnMap}>
                                <Text style={[s.placePinText, isPinPlacementMode && s.placePinTextActive]}>
                                    {isPinPlacementMode ? 'Select Location on Map' : contextSelectedLocation?.id.startsWith('temp-') ? 'Pin Placed - Tap to Change' : 'Place Pin on Map'}
                                </Text>
                            </TouchableOpacity>
                            {firestoreLocationMetadata?.latitude && firestoreLocationMetadata?.longitude && (
                                <View style={s.coordinatesContainer}>
                                    <Text style={s.coordinatesText}>📍 {firestoreLocationMetadata.latitude.toFixed(6)}, {firestoreLocationMetadata.longitude.toFixed(6)}</Text>
                                </View>
                            )}
                        </>
                    )}

                    {mode === 'view' && visibleMedia.length > 0 ? (
                        <>
                            <Text style={s.sectionTitle}>Media</Text>
                            <GalleryGrid media={visibleMedia.map(item => ({ url: item.url, type: item.type }))} onImagePress={handleImagePress} />
                            {hasMoreMedia && <TouchableOpacity style={s.loadMoreButton} onPress={handleLoadMoreMedia}><Text style={s.loadMoreText}>Load More</Text></TouchableOpacity>}
                        </>
                    ) : (
                        mode === 'view' && (
                            <>
                                <Text style={s.sectionTitle}>Media</Text>
                                <Text style={s.noMediaText}>No media files found for this location.</Text>
                            </>
                        )
                    )}

                    {mode === 'add' && (
                        <>
                            <Text style={s.sectionTitle}>Add Media</Text>
                            <MediaUploader onMediaSelected={handleMediaSelected} />
                            <View style={s.mediaPreviewContainer}>
                                {uploadedMedia.map((mediaItem, mediaIdx) => (
                                    <View key={mediaIdx} style={s.mediaPreviewItem}>
                                        <MediaViewer source={mediaItem.path} type={mediaItem.type} style={s.mediaPreview} />
                                        {mediaItem.path && <Text style={s.mediaName}>{mediaItem.path.split('/').pop()}</Text>}
                                    </View>
                                ))}
                            </View>
                            <TouchableOpacity style={[s.submitButton, { backgroundColor: isSubmitting ? colors.gray300 : colors.primary }]} onPress={handleSubmit} disabled={isSubmitting}>
                                <Text style={s.submitButtonText}>{isSubmitting ? 'Saving...' : 'Submit'}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </BottomSheetScrollView>

            <Modal visible={!!modalMedia} transparent={true} animationType="fade" onRequestClose={closeModal}>
                <View style={s.modalContainer}>
                    <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={closeModal} />
                    <View style={s.modalContent}>
                        {modalMedia && <MediaViewer source={modalMedia.url} type={modalMedia.type} />}
                        <View style={s.modalButtonsContainer}>
                            {(modalMedia?.type === 'pdf' || modalMedia?.type === 'image' || modalMedia?.type === 'video') && (
                                <TouchableOpacity style={[s.downloadButton, s.commonModalButtonBase]} onPress={() => Linking.openURL(modalMedia.url)}>
                                    <Text style={s.downloadButtonText}>Download</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[s.closeModalButton, s.commonModalButtonBase]} onPress={closeModal}><Text style={s.closeModalText}>Close</Text></TouchableOpacity>
                            {user?.isAdmin && modalMedia && (
                                <TouchableOpacity style={[s.deleteModalButton, s.commonModalButtonBase]} onPress={handleDeleteMedia}><Text style={s.deleteModalText}>Delete</Text></TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </BottomSheet>
    );
}

export default PopupSheet;
