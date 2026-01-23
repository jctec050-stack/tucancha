
import React, { useState } from 'react';
import { SportType, Court } from '../types';
import { uploadCourtImage } from '../services/dataService';
import { compressImage } from '../utils/imageUtils';

interface AddCourtModalProps {
    currentVenueName: string;
    currentVenueAddress: string;
    currentOpeningHours: string;
    currentImageUrl: string;
    currentAmenities?: string[];
    currentContactInfo?: string;
    currentCourts?: Court[];
    onClose: () => void;
    onSave: (
        venueName: string,
        venueAddress: string,
        openingHours: string,
        imageUrl: string,
        amenities: string[],
        contactInfo: string,
        newCourts: Omit<Court, 'id'>[],
        courtsToDelete: string[]
    ) => void;
}

export const AddCourtModal: React.FC<AddCourtModalProps> = ({
    currentVenueName,
    currentVenueAddress,
    currentOpeningHours,
    currentImageUrl,
    currentAmenities = [],
    currentContactInfo = '',
    currentCourts = [],
    onClose,
    onSave
}) => {
    // Venue State
    const [venueName, setVenueName] = useState(currentVenueName);
    const [venueAddress, setVenueAddress] = useState(currentVenueAddress);

    // Parse initial hours (e.g. "08:00 - 22:00")
    const [startHour, setStartHour] = useState(currentOpeningHours.split(' - ')[0] || '08:00');
    const [endHour, setEndHour] = useState(currentOpeningHours.split(' - ')[1] || '22:00');

    const [imageUrl, setImageUrl] = useState(currentImageUrl);

    // Step 4: Amenities
    const [amenities, setAmenities] = useState<string[]>(currentAmenities);

    // Step 5: Contact
    const [contactPhone, setContactPhone] = useState(currentContactInfo);

    // Pending Courts List
    const [pendingCourts, setPendingCourts] = useState<Omit<Court, 'id'>[]>([]);

    // Courts to Delete
    const [courtsToDelete, setCourtsToDelete] = useState<string[]>([]);
    const [courtToConfirmDelete, setCourtToConfirmDelete] = useState<Court | null>(null);

    // Current Court Form State
    const [courtName, setCourtName] = useState('');
    const [courtType, setCourtType] = useState<SportType>('Padel');
    const [price, setPrice] = useState(0);
    const [error, setError] = useState('');

    // New court image state
    const [courtImageFile, setCourtImageFile] = useState<File | null>(null);
    const [courtImagePreview, setCourtImagePreview] = useState<string>('');
    const [isUploadingCourt, setIsUploadingCourt] = useState(false);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-PY').format(num);
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setPrice(Number(rawValue));
    };

    const handleAddCourtToList = async () => {
        console.log('🏟️ [handleAddCourtToList] START');

        if (!courtName.trim()) {
            setError('Ingresa un nombre para la cancha');
            return;
        }
        if (price <= 0) {
            setError('El precio debe ser mayor a 0');
            return;
        }

        setIsUploadingCourt(true);
        setError(''); // Clear previous errors
        let uploadedImageUrl = '';

        if (courtImageFile) {
            console.log('  📸 Court has image file, uploading...');
            const tempId = `new-${Date.now()}`;

            try {
                const publicUrl = await uploadCourtImage(courtImageFile, tempId);

                if (publicUrl) {
                    uploadedImageUrl = publicUrl;
                    console.log('  ✅ Image uploaded successfully:', uploadedImageUrl);
                } else {
                    console.warn('  ⚠️ Image upload failed or timed out');
                    setError('⚠️ No se pudo subir la imagen (timeout o error). La cancha se guardará sin foto.');
                }
            } catch (err) {
                console.error('  ❌ Upload exception:', err);
                setError('⚠️ Error al subir imagen. La cancha se guardará sin foto.');
            }
        } else {
            console.log('  ℹ️ No image file selected');
        }

        const newCourt: Omit<Court, 'id'> = {
            name: courtName.trim(),
            type: courtType,
            pricePerHour: price,
            address: venueAddress,
            imageUrl: uploadedImageUrl
        };

        console.log('  📝 New court object:', JSON.stringify(newCourt, null, 2));
        setPendingCourts([...pendingCourts, newCourt]);
        console.log('  ✅ Court added to pending list');

        // Reset form
        setCourtName('');
        setPrice(0);
        setCourtImageFile(null);
        setCourtImagePreview('');
        // Don't clear error here - let user see the warning
        setIsUploadingCourt(false);
        console.log('✅ [handleAddCourtToList] END');
    };

    const removePendingCourt = (index: number) => {
        setPendingCourts(pendingCourts.filter((_, i) => i !== index));
    };

    const handleDeleteCourt = (court: Court) => {
        setCourtToConfirmDelete(court);
    };

    const confirmDeleteCourt = () => {
        if (!courtToConfirmDelete) return;
        setCourtsToDelete([...courtsToDelete, courtToConfirmDelete.id]);
        setCourtToConfirmDelete(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!venueName.trim()) {
            setError('El nombre del complejo es obligatorio');
            return;
        }

        const remainingCourts = currentCourts.filter(c => !courtsToDelete.includes(c.id));
        const totalCourts = remainingCourts.length + pendingCourts.length;

        if (totalCourts === 0) {
            setError('Debes tener al menos una cancha en el complejo');
            return;
        }

        const fullOpeningHours = `${startHour} - ${endHour}`;
        onSave(venueName, venueAddress, fullOpeningHours, imageUrl, amenities, contactPhone, pendingCourts, courtsToDelete);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-extrabold text-gray-900">Administrar Complejo</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Section 1: Venue Details */}
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                        <h4 className="font-bold text-gray-800">1. Detalles del Complejo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Complejo</label>
                                <input
                                    type="text"
                                    value={venueName}
                                    onChange={(e) => setVenueName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Dirección</label>
                                <input
                                    type="text"
                                    value={venueAddress}
                                    onChange={(e) => setVenueAddress(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Opening Hours */}
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                        <h4 className="font-bold text-gray-800">2. Horarios de Atención</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Apertura</label>
                                <input
                                    type="time"
                                    value={startHour}
                                    onChange={(e) => setStartHour(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Cierre</label>
                                <input
                                    type="time"
                                    value={endHour}
                                    onChange={(e) => setEndHour(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Venue Photo */}
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                        <h4 className="font-bold text-gray-800">3. Foto del Complejo</h4>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Subir Imagen</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        // Validate file size (max 5MB)
                                        if (file.size > 5 * 1024 * 1024) {
                                            setError('La imagen es muy grande. Máximo 5MB.');
                                            return;
                                        }

                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setImageUrl(reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Formatos: JPG, PNG, WEBP. Máximo 5MB.</p>
                            {imageUrl && (
                                <div className="mt-3 relative">
                                    <div className="h-40 rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setImageUrl('')}
                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-lg"
                                        title="Eliminar imagen"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Amenities */}
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                        <h4 className="font-bold text-gray-800">4. Servicios (Amenities)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {['Wifi', 'Estacionamiento', 'Vestuarios', 'Bar/Cantina', 'Iluminación LED', 'Alquiler de Paletas'].map(item => (
                                <label key={item} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={amenities.includes(item)}
                                        onChange={() => {
                                            if (amenities.includes(item)) {
                                                setAmenities(amenities.filter(a => a !== item));
                                            } else {
                                                setAmenities([...amenities, item]);
                                            }
                                        }}
                                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-gray-700 text-sm font-medium">{item}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Section 5: Contact */}
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                        <h4 className="font-bold text-gray-800">5. Contacto</h4>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono / WhatsApp</label>
                            <input
                                type="text"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="+595 9..."
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Section 6: Add Courts */}
                    <div className="bg-indigo-50 p-4 rounded-2xl space-y-4">
                        <h4 className="font-bold text-indigo-900">6. Agregar Canchas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-indigo-800 mb-1">Nombre Cancha</label>
                                <input
                                    type="text"
                                    value={courtName}
                                    onChange={(e) => setCourtName(e.target.value)}
                                    placeholder="Ej: Cancha 1"
                                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-indigo-800 mb-1">Deporte</label>
                                <select
                                    value={courtType}
                                    onChange={(e) => setCourtType(e.target.value as SportType)}
                                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Padel">Padel</option>
                                    <option value="Beach Tennis">Beach Tennis</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-indigo-800 mb-1">Precio (Gs)</label>
                                <input
                                    type="text"
                                    value={price === 0 ? '' : formatNumber(price)}
                                    onChange={handlePriceChange}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            {/* Court Image Input */}
                            <div className="md:col-span-6">
                                <label className="block text-xs font-bold text-indigo-800 mb-1">Foto de la Cancha (Opcional)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                try {
                                                    // Compress image before setting state
                                                    const compressedFile = await compressImage(file);
                                                    setCourtImageFile(compressedFile);

                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setCourtImagePreview(reader.result as string);
                                                    reader.readAsDataURL(compressedFile);
                                                } catch (err) {
                                                    console.error('Error compressing image:', err);
                                                    setError('Error al procesar la imagen.');
                                                }
                                            }
                                        }}
                                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                    {courtImagePreview && (
                                        <div className="h-10 w-16 rounded overflow-hidden border border-gray-200">
                                            <img src={courtImagePreview} alt="Preview" className="h-full w-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <button
                                    type="button"
                                    onClick={handleAddCourtToList}
                                    disabled={isUploadingCourt}
                                    className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                                >
                                    {isUploadingCourt ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                                    ) : (
                                        '+ Agregar'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section 7: Existing Courts */}
                    {currentCourts.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-800 mb-3">7. Canchas Existentes ({currentCourts.filter(c => !courtsToDelete.includes(c.id)).length})</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {currentCourts.filter(c => !courtsToDelete.includes(c.id)).map((court) => (
                                    <div key={court.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            {court.imageUrl ? (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={court.imageUrl} alt={court.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <span className={`w-2 h-8 rounded-full ${court.type === 'Padel' ? 'bg-indigo-500' : 'bg-orange-400'}`}></span>
                                            )}
                                            <div>
                                                <p className="font-bold text-gray-900">{court.name}</p>
                                                <p className="text-xs text-gray-500">{court.type} • Gs. {formatNumber(court.pricePerHour)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCourt(court)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                            title="Eliminar cancha"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section 8: Pending List */}
                    {pendingCourts.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-800 mb-3">8. Canchas Nuevas a Agregar ({pendingCourts.length})</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {pendingCourts.map((court, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            {court.imageUrl ? (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={court.imageUrl} alt={court.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <span className={`w-2 h-8 rounded-full ${court.type === 'Padel' ? 'bg-indigo-500' : 'bg-orange-400'}`}></span>
                                            )}
                                            <div>
                                                <p className="font-bold text-gray-900">{court.name}</p>
                                                <p className="text-xs text-gray-500">{court.type} • Gs. {formatNumber(court.pricePerHour)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removePendingCourt(idx)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                        >
                            Guardar Todo
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal for Deleting Court */}
            {courtToConfirmDelete && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar Cancha?</h3>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de que deseas eliminar <span className="font-bold">{courtToConfirmDelete.name}</span>?
                            Esta acción eliminará todas las reservas asociadas y no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCourtToConfirmDelete(null)}
                                className="flex-1 py-2 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeleteCourt}
                                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
