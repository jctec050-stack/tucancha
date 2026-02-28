
import React, { useState } from 'react';
import { SportType, Court } from '../types';
import { uploadCourtImage, uploadImage } from '../services/dataService';
import { compressImage } from '../utils/imageUtils';

interface AddCourtModalProps {
    currentVenueName: string;
    currentVenueAddress: string;
    currentOpeningHours: string;
    currentClosedDays?: number[];
    currentImageUrl: string;
    currentAmenities?: string[];
    currentContactInfo?: string;
    currentLimitFutureBookings?: boolean;
    currentCourts?: Court[];
    currentDepositRequired?: boolean;
    currentDepositAmount?: number;
    currentBankName?: string;
    currentAccountNumber?: string;
    currentAccountName?: string;
    currentTaxId?: string;
    currentAlias?: string;
    onClose: () => void;
    onSave: (
        venueName: string,
        venueAddress: string,
        openingHours: string,
        closedDays: number[],
        imageUrl: string,
        amenities: string[],
        contactInfo: string,
        newCourts: Omit<Court, 'id'>[],
        courtsToDelete: string[],
        limitFutureBookings: boolean,
        depositRequired: boolean,
        depositAmount: number,
        bankName: string,
        accountNumber: string,
        accountName: string,
        taxId: string,
        alias: string
    ) => Promise<void>;
}

export const AddCourtModal: React.FC<AddCourtModalProps> = ({
    currentVenueName,
    currentVenueAddress,
    currentOpeningHours,
    currentClosedDays = [],
    currentImageUrl,
    currentAmenities = [],
    currentContactInfo = '',
    currentLimitFutureBookings = false,
    currentCourts = [],
    currentDepositRequired = false,
    currentDepositAmount = 0,
    currentBankName = '',
    currentAccountNumber = '',
    currentAccountName = '',
    currentTaxId = '',
    currentAlias = '',
    onClose,
    onSave
}) => {
    // Venue State
    const [venueName, setVenueName] = useState(currentVenueName);
    const [venueAddress, setVenueAddress] = useState(currentVenueAddress);
    
    // Deposit Settings
    const [depositRequired, setDepositRequired] = useState(currentDepositRequired);
    const [depositAmount, setDepositAmount] = useState(currentDepositAmount);
    const [showBankModal, setShowBankModal] = useState(false);
    
    // Bank Details
    const [bankName, setBankName] = useState(currentBankName);
    const [accountNumber, setAccountNumber] = useState(currentAccountNumber);
    const [accountName, setAccountName] = useState(currentAccountName);
    const [taxId, setTaxId] = useState(currentTaxId);
    const [alias, setAlias] = useState(currentAlias);

    // Parse initial hours (e.g. "08:00 - 22:00")
    const [startHour, setStartHour] = useState(currentOpeningHours.split(' - ')[0] || '08:00');
    const [endHour, setEndHour] = useState(currentOpeningHours.split(' - ')[1] || '22:00');
    
    // Closed Days
    const [closedDays, setClosedDays] = useState<number[]>(currentClosedDays);

    const [imageUrl, setImageUrl] = useState(currentImageUrl);
    const [venueImageFile, setVenueImageFile] = useState<File | null>(null);

    // Step 4: Amenities
    const [amenities, setAmenities] = useState<string[]>(currentAmenities);

    // Step 5: Contact
    const [contactPhone, setContactPhone] = useState(currentContactInfo);

    // Step X: Settings
    const [limitFutureBookings, setLimitFutureBookings] = useState(currentLimitFutureBookings);

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

    // Save state
    const [isSaving, setIsSaving] = useState(false);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-PY').format(num);
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setPrice(Number(rawValue));
    };

    const handleAddCourtToList = async () => {

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
            } catch (err: any) {
                console.error('  ❌ Upload exception:', err);
                setError(`⚠️ Error al subir imagen: ${err.message || 'Error desconocido'}. La cancha se guardará sin foto.`);
            }
        } else {
        }

        const newCourt: Omit<Court, 'id'> = {
            venue_id: '',
            name: courtName.trim(),
            type: courtType,
            price_per_hour: price,
            image_url: uploadedImageUrl,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        setPendingCourts([...pendingCourts, newCourt]);

        // Reset form
        setCourtName('');
        setPrice(0);
        setCourtImageFile(null);
        setCourtImagePreview('');
        // Don't clear error here - let user see the warning
        setIsUploadingCourt(false);
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

    const handleSave = async (e: React.FormEvent) => {
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

        if (depositRequired) {
            if (depositAmount <= 0) {
                setError('Si requieres seña, el monto debe ser mayor a 0.');
                return;
            }
            if (!bankName || !accountNumber || !accountName || !taxId) {
                setError('Si requieres seña, debes completar todos los datos bancarios obligatorios.');
                return;
            }
        }

        setIsSaving(true);
        setError('');

        try {
            // Upload Venue Image if new file selected
            let finalVenueImageUrl = imageUrl;
            if (venueImageFile) {
                const cleanFileName = venueImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const path = `venues/${Date.now()}_${cleanFileName}`;
                // Upload
                const uploadedUrl = await uploadImage(venueImageFile, 'venue-images', path);
                if (uploadedUrl) {
                    finalVenueImageUrl = uploadedUrl;
                } else {
                    console.warn('Venue image upload failed, proceeding without new image');
                    // Look out! We might be sending Base64 if upload fails and we fallback to imageUrl state
                    // Better to fallback to empty string or currentImageUrl if upload failed?
                    // Actually, if upload fails, we probably shouldn't send Base64.
                    // But if we fail, we probably should stop.
                    // For now, let's just warn.
                    if (imageUrl.startsWith('data:')) {
                        // If it's base64, don't send it. Use empty or old.
                        finalVenueImageUrl = currentImageUrl;
                    }
                }
            } else if (imageUrl.startsWith('data:')) {
                // Check edge case: imageUrl is base64 but no file? (Shouldn't happen with logic above)
                finalVenueImageUrl = currentImageUrl;
            }

            const fullOpeningHours = `${startHour} - ${endHour}`;
            await onSave(
                venueName,
                venueAddress,
                fullOpeningHours,
                closedDays,
                finalVenueImageUrl,
                amenities,
                contactPhone,
                pendingCourts,
                courtsToDelete,
                limitFutureBookings,
                depositRequired,
                depositAmount,
                bankName,
                accountNumber,
                accountName,
                taxId,
                alias
            );
            onClose();
        } catch (err) {
            console.error('Error saving venue:', err);
            setError('Error al guardar el complejo. Por favor intenta nuevamente.');
        } finally {
            setIsSaving(false);
        }
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
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-800">2. Horarios y Reglas</h4>
                        </div>
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

                        {/* Limit Future Bookings Toggle */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                            <div>
                                <p className="text-sm font-bold text-gray-800">Habilitado por día</p>
                                <p className="text-xs text-gray-500">Solo permitir reservas para el día actual</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={limitFutureBookings}
                                    onChange={(e) => setLimitFutureBookings(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        
                        <div className="mt-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Días Cerrados (No se abre)</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 1, label: 'Lun' },
                                    { id: 2, label: 'Mar' },
                                    { id: 3, label: 'Mié' },
                                    { id: 4, label: 'Jue' },
                                    { id: 5, label: 'Vie' },
                                    { id: 6, label: 'Sáb' },
                                    { id: 0, label: 'Dom' }
                                ].map((day) => (
                                    <button
                                        key={day.id}
                                        type="button"
                                        onClick={() => {
                                            if (closedDays.includes(day.id)) {
                                                setClosedDays(closedDays.filter(d => d !== day.id));
                                            } else {
                                                setClosedDays([...closedDays, day.id]);
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                            closedDays.includes(day.id)
                                                ? 'bg-red-500 text-white shadow-md'
                                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Selecciona los días que el complejo permanece CERRADO.
                            </p>
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
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        try {
                                            // Validate file size (max 5MB)
                                            if (file.size > 5 * 1024 * 1024) {
                                                setError('La imagen es muy grande. Máximo 5MB.');
                                                return;
                                            }

                                            // Compress image before setting state
                                            const compressedFile = await compressImage(file);
                                            setVenueImageFile(compressedFile);

                                            // Preview
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setImageUrl(reader.result as string);
                                            };
                                            reader.readAsDataURL(compressedFile);
                                        } catch (err) {
                                            console.error('Error compressing venue image:', err);
                                            setError('Error al procesar la imagen.');
                                        }
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

                    {/* Section 6: Payment Settings */}
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                        <h4 className="font-bold text-gray-800">6. Configuración de Pagos</h4>
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                            <div>
                                <p className="text-sm font-bold text-gray-800">Requerir Seña (Transferencia)</p>
                                <p className="text-xs text-gray-500">Solicitar comprobante de transferencia para confirmar reservas</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={depositRequired}
                                    onChange={(e) => {
                                        setDepositRequired(e.target.checked);
                                        if (e.target.checked && !bankName) {
                                            setShowBankModal(true);
                                        }
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {depositRequired && (
                            <div className="bg-white p-3 rounded-xl border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Monto de la Seña (Gs)</label>
                                <input
                                    type="text"
                                    value={depositAmount === 0 ? '' : formatNumber(depositAmount)}
                                    onChange={(e) => {
                                        const rawValue = e.target.value.replace(/\D/g, '');
                                        setDepositAmount(Number(rawValue));
                                    }}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        )}

                        {depositRequired && (
                            <button
                                type="button"
                                onClick={() => setShowBankModal(true)}
                                className="w-full py-2 border-2 border-indigo-100 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                {bankName ? 'Editar Datos Bancarios' : 'Configurar Datos Bancarios'}
                            </button>
                        )}
                        
                        {depositRequired && bankName && (
                            <div className="text-xs text-gray-500 bg-white p-3 rounded-lg border border-gray-100">
                                <p><span className="font-bold">Banco:</span> {bankName}</p>
                                <p><span className="font-bold">Cuenta:</span> {accountNumber}</p>
                                <p><span className="font-bold">Titular:</span> {accountName}</p>
                            </div>
                        )}
                    </div>

                    {/* Section 7: Add Courts */}
                    <div className="bg-indigo-50 p-4 rounded-2xl space-y-4">
                        <h4 className="font-bold text-indigo-900">7. Agregar Canchas</h4>
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

                    {/* Section 8: Existing Courts */}
                    {currentCourts.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-800 mb-3">8. Canchas Existentes ({currentCourts.filter(c => !courtsToDelete.includes(c.id)).length})</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {currentCourts.filter(c => !courtsToDelete.includes(c.id)).map((court) => (
                                    <div key={court.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            {court.image_url ? (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={court.image_url} alt={court.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <span className={`w-2 h-8 rounded-full ${court.type === 'Padel' ? 'bg-indigo-500' : 'bg-orange-400'}`}></span>
                                            )}
                                            <div>
                                                <p className="font-bold text-gray-900">{court.name}</p>
                                                <p className="text-xs text-gray-500">{court.type} • Gs. {formatNumber(court.price_per_hour)}</p>
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

                    {/* Section 9: Pending List */}
                    {pendingCourts.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-800 mb-3">9. Canchas Nuevas a Agregar ({pendingCourts.length})</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {pendingCourts.map((court, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            {court.image_url ? (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={court.image_url} alt={court.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <span className={`w-2 h-8 rounded-full ${court.type === 'Padel' ? 'bg-indigo-500' : 'bg-orange-400'}`}></span>
                                            )}
                                            <div>
                                                <p className="font-bold text-gray-900">{court.name}</p>
                                                <p className="text-xs text-gray-500">{court.type} • Gs. {formatNumber(court.price_per_hour)}</p>
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
                            disabled={isSaving}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Guardando...
                                </>
                            ) : (
                                'Guardar Todo'
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Bank Details Modal */}
            {showBankModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Datos Bancarios</h3>
                            <button onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Banco</label>
                                <input
                                    type="text"
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ej: Banco Itaú"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nro. Cuenta</label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ej: 123456789"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Titular</label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Nombre completo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">RUC o C.I.</label>
                                <input
                                    type="text"
                                    value={taxId}
                                    onChange={(e) => setTaxId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Documento de identidad"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Alias (Opcional)</label>
                                <input
                                    type="text"
                                    value={alias}
                                    onChange={(e) => setAlias(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ej: mi.negocio.py"
                                />
                            </div>
                            
                            <button
                                onClick={() => setShowBankModal(false)}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition mt-2"
                            >
                                Guardar Datos
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
