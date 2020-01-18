import {IRange, IHeights, IDirection} from "./interfaces";

interface IVirtualScrollOptions {
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

export default class VirtualScroll {
    private _options: IVirtualScrollOptions;
    private _range: IRange;

    get range() {
        return this._range;
    }

    constructor(options: Partial<IVirtualScrollOptions>) {
        this.setOptions(options);
    }

    setOptions(options: Partial<IVirtualScrollOptions>): void {
        this._options = {...this._options, ...options};
    }

    /**
     * Расчет видимых индексов от переданного индекса
     * @remark
     * Вызывается при инциализации виртуального скролла от переданного индекса
     * @param index
     * @param itemsCount
     */
    updateRangeByIndex(index: number, itemsCount: number): IRange {
        const pageSize = this._options.pageSize;
        let start, stop;

        if (pageSize < itemsCount) {
            start = index;
            stop = start + pageSize;

            if (stop >= itemsCount) {
                stop = itemsCount;
                start = stop - pageSize;
            }
        } else {
            start = 0;
            stop = itemsCount;
        }

        return this._setRange({start, stop});
    }

    /**
     * Расчет видимых индексов от заранее высчитанных высот
     * @remark
     * Используется для оптимизаций частных случаев, когда построить один лишний элемент будет очень дорого,
     * например если один элемент это огромный пункт с кучей контролов внутри)
     * @param index Начальный индекс
     * @param heights
     */
    updateRangeByItemHeightProperty(index: number, heights: IHeights): IRange {
        let sumHeight = 0;
        let stop: number;

        for (let i = index; i < heights.items.length; i++) {
            const itemHeight = heights.items[i];
            if (sumHeight + itemHeight <= heights.viewport) {
                sumHeight += itemHeight;
            } else {
                stop = i;
                break;
            }
        }

        /**
         * @remark Так как списки итерируются пока i < stopIndex, то нужно добавить 1
         * @example items: [{height: 20, ...}, {height: 40, ...}, {height: 50, ...}], itemHeightProperty: 'height'
         * viewportHeight: 70
         * Если бы мы не добавили единицу, то получили бы startIndex = 0 и stopIndex = 2, но так как итерируюется
         * пока i < stopIndex, то мы получим не три отрисованных элемента, а 2
         */

        return this._setRange({start: index, stop: stop + 1});
    }

    /**
     * Рассчет видимых индексов от позиции скролла
     * @remark
     * Вызывается при смещении скролла за счет движения скроллбара
     * @param heights
     */
    updateRangeByScrollTop(heights: IHeights): IRange {
        const scrollTop = heights.scrollTop;
        const pageSize = this._options.pageSize;
        const itemsCount = heights.items.length;
        let start = 0, stop;
        let tempPlaceholderSize = 0;
        while (tempPlaceholderSize + heights.items[start] <= scrollTop - heights.trigger) {
            tempPlaceholderSize += heights.items[start];
            start++;
        }

        start = Math.max(start - (Math.trunc(pageSize / 2)), 0);
        stop = Math.min(start + pageSize, itemsCount);

        // Если мы скроллим быстро к концу списка, startIndex может вычислиться такой,
        // что число отрисовываемых записей будет меньше virtualPageSize (например если
        // в списке из 100 записей по scrollTop вычисляется startIndex == 95, то stopIndex
        // будет равен 100 при любом virtualPageSize >= 5.
        // Нам нужно всегда рендерить virtualPageSize записей, если это возможно, т. е. когда
        // в коллекции достаточно записей. Поэтому если мы находимся в конце списка, пробуем
        // отодвинуть startIndex назад так, чтобы отрисовывалось нужное число записей.
        if (stop === itemsCount) {
            const missingCount = pageSize - (stop - start);
            if (missingCount > 0) {
                start = Math.max(start - missingCount, 0);
            }
        }

        return this._setRange({start, stop});
    }

    updateRangeByDirection(direction: string, heights: IHeights, shouldLoad: boolean= true): {
        range: IRange; needToLoad: boolean;
    } {
        const itemsCount = heights.items.length;
        const segmentSize = this._options.segmentSize;
        let {start, stop} = this._range;
        let needToLoadMore: boolean = false;

        if (start === 0 && direction === 'up' || stop === itemsCount && direction === 'down') {
            needToLoadMore = true;
        } else {
            const quantity = VirtualScroll.getItemsToHideQuantity(direction, heights);

            if (direction === 'up') {
                if (start <= segmentSize) {
                    needToLoadMore = true;
                }

                start = Math.max(0, start - segmentSize);
                stop -= quantity;
            } else {
                if (stop + segmentSize >= itemsCount) {
                    needToLoadMore = true;
                }

                stop = Math.min(stop + segmentSize, itemsCount);
                start += quantity;
            }
        }

        return {
            needToLoad: needToLoadMore && shouldLoad, range: this._setRange({start, stop})
        }
    }

    /**
     * Рассчитывает сколько элементов нужно скрыть
     * @remark Оставляем элементов с запасом на 2 вьюпорта для плавного скроллинга
     */
    private static getItemsToHideQuantity(direction: string, heights: IHeights): number {
        if (direction === 'up') {
            return VirtualScroll._getItemsToHideQuantityToUp(heights);
        } else {
            return VirtualScroll._getItemsToHideQuantityToDown(heights);
        }
    }

    // Методы публичные для юнитов
    /**
     * Рассчитывает сколько элементов нужно скрыть сверху
     */
    static _getItemsToHideQuantityToUp(heights: IHeights): number {

    }

    /**
     * Рассчитывает сколько элементов нужно скрыть сверху
     */
    static _getItemsToHideQuantityToDown(heights: IHeights): number {

    }

    private _setRange(range: IRange): IRange {
        return this._range = range;
    }
}