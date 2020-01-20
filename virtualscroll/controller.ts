import {IRange, IContainerHeights, IDirection, IItemsHeights, IVirtualScrollOptions, IPreviewHeights} from "./interfaces";

export default class VirtualScroll {
    private _containerHeightsData: IContainerHeights = {scrollHeight: 0, scrollTop: 0, trigger: 0, viewport: 0};
    private _options: IVirtualScrollOptions;
    private _range: IRange;
    private _oldRange: IRange;

    get range() {
        return this._range;
    }

    get containerHeightsData() {
        return this._containerHeightsData;
    }

    constructor(
        options: Partial<IVirtualScrollOptions>,
        containerData: Partial<IContainerHeights>
    ) {
        this.setOptions(options);
        this.applyContainerHeightsData(containerData);
    }

    setOptions(options: Partial<IVirtualScrollOptions>): void {
        this._options = {...this._options, ...options};
    }

    applyContainerHeightsData(containerData: Partial<IContainerHeights>): void {
        this._containerHeightsData = {...this._containerHeightsData, ...containerData};
    }

    createNewRange(startIndex: number, itemsCount: number, previewHeights?: IPreviewHeights): IRange {
        return previewHeights ?
            this.createRangeByIndex(startIndex, itemsCount) :
            this._createRangeByItemHeightProperty(startIndex, itemsCount, previewHeights);
    }

    /**
     * Рассчет видимых индексов от позиции скролла
     * @remark
     * Вызывается при смещении скролла за счет движения скроллбара
     */
    moveRangeByScrollPosition(scrollTop: number, itemsHeights: number[]): IRange {
        const pageSize = this._options.pageSize;
        const itemsCount = itemsHeights.length;
        const triggerHeight = this._containerHeightsData.trigger;

        let start = 0, stop;
        let tempPlaceholderSize = 0;

        while (tempPlaceholderSize + itemsHeights[start] <= scrollTop - triggerHeight) {
            tempPlaceholderSize += itemsHeights[start];
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

    moveRangeByItemsAdd(direction: IDirection, itemsHeightsData: IItemsHeights, newItemsLength: number): IRange {
        if (direction === 'up') {
            this._updateStartIndex(this._range.start + newItemsLength, itemsHeightsData.itemsHeights.length);
        }

        return this.moveRangeByDirection(direction, itemsHeightsData).range;
    }

    moveRangeByItemsRemove(direciton: IDirection, itemsHeightsData: IItemsHeights): IRange {
        return this.moveRangeByDirection(direciton, itemsHeightsData).range;
    }

    moveRangeByDirection(direction: IDirection, itemsHeightsData: IItemsHeights): {
        range: IRange; needToLoad: boolean;
    } {
        this._oldRange = this._range;
        const itemsCount = itemsHeightsData.itemsHeights.length;
        const segmentSize = this._options.segmentSize;
        let {start, stop} = this._range;
        let needToLoad: boolean = false;

        if (start === 0 && direction === 'up' || stop === itemsCount && direction === 'down') {
            needToLoad = true;
        } else {
            const quantity = VirtualScroll.getItemsToHideQuantity(direction, this._containerHeightsData, itemsHeightsData);

            if (direction === 'up') {
                if (start <= segmentSize) {
                    needToLoad = true;
                }

                start = Math.max(0, start - segmentSize);
                stop -= quantity;
            } else {
                if (stop + segmentSize >= itemsCount) {
                    needToLoad = true;
                }

                stop = Math.min(stop + segmentSize, itemsCount);
                start += quantity;
            }
        }

        return {
            needToLoad, range: this._setRange({start, stop})
        }
    }

    getRestoredPosition(direction: IDirection, scrollTop: number): number {
        return direction === 'up' ?
            scrollTop +  this._getItemsHeightsSum(this._range.start, this._oldRange.start) :
            scrollTop - this._getItemsHeightsSum(this._oldRange.start, this._range.start);
    }

    /**
     * Расчет видимых индексов от заранее высчитанных высот
     * @remark
     * Используется для оптимизаций частных случаев, когда построить один лишний элемент будет очень дорого,
     * например если один элемент это огромный пункт с кучей контролов внутри)
     * @param startIndex Начальный индекс
     * @param itemsCount Количество элементов
     * @param previewHeights Предрасчитанные высоты
     */
    private _createRangeByItemHeightProperty(startIndex: number, itemsCount: number, previewHeights: IPreviewHeights): IRange {
        const {itemsHeights, viewportHeight} = previewHeights;

        let sumHeight = 0;
        let stop: number;

        for (let i = startIndex; i < itemsHeights.length; i++) {
            const itemHeight = itemsHeights[i];
            if (sumHeight + itemHeight <= viewportHeight) {
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

        return this._setRange({start: startIndex, stop: stop + 1});
    }

    /**
     * Расчет видимых индексов от переданного индекса
     * @remark
     * Вызывается при инциализации виртуального скролла от переданного индекса
     * @param startIndex
     * @param itemsCount
     */
    private createRangeByIndex(startIndex: number, itemsCount: number): IRange {
        const pageSize = this._options.pageSize;
        let start, stop;

        if (pageSize < itemsCount) {
            start = startIndex;
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

    private _updateStartIndex(index: number, itemsCount: number): IRange {
        const start = Math.max(0, index);
        const stop = Math.min(itemsCount, this._range.start + this._options.pageSize);
        this._range.start = Math.max(0, index);
        this._range.stop = Math.min(itemsCount, this._range.start + this._options.pageSize);
    }

    /**
     * Рассчитывает сколько элементов нужно скрыть
     * @remark Оставляем элементов с запасом на 2 вьюпорта для плавного скроллинга
     */
    private static getItemsToHideQuantity(direction: string, containerHeights: IContainerHeights, itemsHeights: IItemsHeights): number {
        if (direction === 'up') {
            return VirtualScroll._getItemsToHideQuantityToUp(containerHeights, itemsHeights);
        } else {
            return VirtualScroll._getItemsToHideQuantityToDown(containerHeights, itemsHeights);
        }
    }

    // Методы публичные для юнитов
    /**
     * Рассчитывает сколько элементов нужно скрыть сверху
     */
    static _getItemsToHideQuantityToUp(heights: IContainerHeights, itemsHeights: IItemsHeights): number {

    }

    /**
     * Рассчитывает сколько элементов нужно скрыть сверху
     */
    static _getItemsToHideQuantityToDown(heights: IContainerHeights, itemsHeights: IItemsHeights): number {

    }

    private _setRange(range: IRange): IRange {
        return this._range = range;
    }

    private _getItemsHeightsSum(startIndex: number, stopIndex: number): number {
        let sum = 0;

        for (let i = startIndex; i < stopIndex; i++) {
            sum += this._itemsHeightsData.itemsHeights[i];
        }

        return sum;
    }
}