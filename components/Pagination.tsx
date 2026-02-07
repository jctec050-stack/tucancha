import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startIndex: number;
    endIndex: number;
    totalItems: number;
}

/**
 * Componente de paginación reutilizable con diseño profesional
 */
export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
    totalItems,
}: PaginationProps) {
    // No mostrar paginación si solo hay 1 página
    if (totalPages <= 1) {
        return null;
    }

    // Generar array de números de página a mostrar
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            // Mostrar todas las páginas si son pocas
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Mostrar páginas con ellipsis
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }

        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-200">
            {/* Info de items */}
            <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex}</span> a{' '}
                <span className="font-medium">{endIndex}</span> de{' '}
                <span className="font-medium">{totalItems}</span> resultados
            </div>

            {/* Controles de navegación */}
            <div className="flex items-center gap-2">
                {/* Botón Previous */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!hasPrevPage}
                    className={`
            px-3 py-2 rounded-lg text-sm font-medium transition
            ${hasPrevPage
                            ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                        }
          `}
                >
                    Anterior
                </button>

                {/* Números de página */}
                <div className="hidden sm:flex items-center gap-1">
                    {getPageNumbers().map((page, index) => {
                        if (page === '...') {
                            return (
                                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                                    ...
                                </span>
                            );
                        }

                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page as number)}
                                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition
                  ${currentPage === page
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }
                `}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile: Solo mostrar número de página actual */}
                <div className="sm:hidden text-sm text-gray-700">
                    Página <span className="font-medium">{currentPage}</span> de{' '}
                    <span className="font-medium">{totalPages}</span>
                </div>

                {/* Botón Next */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!hasNextPage}
                    className={`
            px-3 py-2 rounded-lg text-sm font-medium transition
            ${hasNextPage
                            ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                        }
          `}
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}
