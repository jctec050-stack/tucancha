export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <img src="/logo.png" alt="TuCancha" className="w-24 h-24 object-contain animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin opacity-50"></div>
                </div>
                <p className="text-gray-500 font-medium animate-pulse">Cargando...</p>
            </div>
        </div>
    );
}
