export interface IRange {
    // стартовый индекс отображения
    start: number;
    // коненый индекс отображения
    stop: number;
}

/**
 * Интерфейс с данными об высотах
 */
export interface IContainerHeights {
    // Высота вьюпорта
    viewport: number;
    // Высота контейнера
    scroll: number;
    // Высота триггера
    trigger: number;
}

export interface IItemsHeights {
    // Высоты элементов
    itemsHeights: number[];
    // Оффсеты элементов
    itemsOffsets: number[];
}

export interface IVirtualScrollOptions {
    /**
     * Размер виртуальной страницы
     * Используется для построения от индекса
     */
    pageSize: number;
    /**
     * Количество добавляемых записей
     */
    segmentSize: number;
}

export type IDirection = 'up' | 'down';