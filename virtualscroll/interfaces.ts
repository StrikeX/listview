export interface IRange {
    // стартовый индекс отображения
    start: number;
    // коненый индекс отображения
    stop: number;
}

/**
 * Интерфейс с данными об высотах
 */
export interface IHeights {
    // Высота вьюпорта
    viewport: number;
    // Высоты элементов
    items: number[];
    // Оффсеты элементов
    itemsOffsets: number[];
    // Высота позиции скролла
    scrollTop: number;
    // Высота контейнера с элементами
    itemsContainer: number;
    // Высота триггера
    trigger: number;
}

export type IDirection = 'up' | 'down';