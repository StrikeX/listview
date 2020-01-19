import {IContainerHeights, IItemsHeights} from "./interfaces";

export function canScrollToItem(index: number, range: IRange, itemsHeights: IItemsHeights, containerHeights: IContainerHeights): boolean {
    /**
     * Расчет возможности подскроллить к элементу, если к элементу невозможно подскроллить то необходимо пересчитать
     * индексы от этого элемента
     */
    return result;
}

export function getActiveElementIndex(range: IRange, itemsHeights: IItemsHeights, containerHeights: IContainerHeights): number {
    /**
     * Расчет активного элемента
     */
    if (isScrolledToBottom()) {
        return range.stop - 1;
    } else if (isScrolledToTop()) {
        return range.start;
    } else {
        return getActiveElementByOffset(heights);
    }
}