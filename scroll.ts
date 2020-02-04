import VirtualScroll from './virtualscroll/controller';
import {ICollection} from "./interfaces";
import {
    IDirection,
    IItemsHeights,
    IVirtualScrollOptions
} from "./virtualscroll/interfaces";

interface IVirtualScrollConfig extends IVirtualScrollOptions {
    viewportHeight: number;
}

interface IOptions {
    collection: ICollection;
    pageSize: number;
    segmentSize: number;
    activeElement?: string;
    itemHeightProperty?: string;
    virtualScroll: boolean;
    virtualScrollConfig: IVirtualScrollConfig;
}

interface IScrollEventParams {
    viewportHeight: number;
    scrollTop: number;
    scrollHeight: number;
}

class Scroll {
    private _virtualScroll: VirtualScroll = new VirtualScroll({}, {});
    private _options: IOptions;
    private _children: {
        observer: {
            start: () => void
        },
        itemsContainer: HTMLElement;
    };
    private _triggerVisibility: {
        up: boolean;
        down: boolean;
    }

    private _scrollTop: number;

    private _restoreScrollResolve: Function;

    private _triggerOffset: number;

    protected _beforeMount(options: IOptions): void {
        this._initVirtualScroll(options);
    }

    protected _afterMount(): void {
        this._observeScrollEvents();
    }

    protected _beforeUpdate(options: IOptions): void {
        if (options.collection !== this._options.collection) {
            this._initVirtualScroll(options);
        }
    }

    protected _afterRender(): void {
        if (this._virtualScroll.rangeChanged) {
            this._virtualScroll.updateItems(Scroll.getItemsHeightsDataByContainer(this._children.itemsContainer));
        }

        if (this._virtualScroll.isNeedToRestorePosition) {
            this._restoreScrollPosition();
        }
    }

    /**
     * Функция подскролла к элементу
     * @param {string | number} key
     * @remark Функция подскролливает к записи, если это возможно, в противном случае вызовется перестроение
     * от элемента
     */
    scrollToItem(key: string): Promise<void> {
        const index = this._options.collection.getIndexById(key);

        if (index) {
            return new Promise((resolve, reject) => {
                const scrollCallback = (position: number) => {
                    this._scrollToPosition(position);
                    resolve();
                };

                if (this._virtualScroll.canScrollToItem(index)) {
                    scrollCallback(this._virtualScroll.itemsOffsets[index]);
                } else {
                    const range = this._virtualScroll.resetRange(index, this._options.collection.getCount());
                    this._options.collection.setViewIndices(range);
                    this._restoreScrollResolve = resolve;
                }
            });
        } else {
            return Promise.reject();
        }
    }

    /**
     * Восстанавливает корректную позицию скролла
     * @private
     */
    private _restoreScrollPosition(): void {
        this._scrollToPosition(this._virtualScroll.getPositionToRestore(this._scrollTop));

        if (this._restoreScrollResolve) {
            this._restoreScrollResolve();
            this._restoreScrollResolve = null;
        }
    }

    /**
     * Нотифицирует скролл контейнеру о том, что нужно подскролить к переданной позиции
     * @param position
     */
    private _scrollToPosition(position: number): void {
        this._notify('setScrollPosition', [position], {bubbling: true});
    }

    private _observeScrollEvents(): void {
        this._children.observer.start();
    }

    /**
     * Инициализирует virtualScroll
     * @param options
     * @private
     */
    private _initVirtualScroll(options: IOptions): void {
        this._virtualScroll.setOptions({
            segmentSize: options.segmentSize, pageSize: options.pageSize
        });
        let itemsHeights: Partial<IItemsHeights>;

        const initialIndex = options.activeElement ? options.collection.getItemIndexById(options.activeElement) : 0;

        if (options.itemHeightProperty) {
            this._virtualScroll.applyContainerHeightsData({
                viewport: options.virtualScrollConfig.viewportHeight
            });
            itemsHeights = {
                itemsHeights: options.collection.map(item => item.get(options.itemHeightProperty))
            };
        }

        const range = this._virtualScroll.resetRange(initialIndex, options.collection.getCount(), itemsHeights);
        options.collection.setViewIndices(range);

        this._subscribeToCollectionChange(options.collection);
    }

    private _subscribeToCollectionChange(collection: ICollection): void {
        collection.subscribe('onChange', this._collectionChangeHandler);
    }

    /**
     * Обработчик смены данных в коллекции
     * @param event
     * @param changesType
     * @param action
     * @param newItems
     * @param newItemsIndex
     * @param removedItems
     * @param removedItemsIndex
     * @private
     */
    private _collectionChangeHandler(
        event: string,
        changesType: string,
        action: string,
        newItems: CollectionItem[],
        newItemsIndex: number,
        removedItems: CollectionItem[],
        removedItemsIndex: number): void {
        if (changesType === 'collectionChanged' && action) {
            if (action === IObservable.ACTION_ADD || action === IObservable.ACTION_MOVE) {
                this._itemsAddedHandler(newItemsIndex, newItems);
            }

            if (action === IObservable.ACTION_REMOVE || action === IObservable.ACTION_MOVE) {
                this._itemsRemovedHandler(removedItemsIndex, removedItems);
            }

            if (action === IObservable.ACTION_RESET) {
                this._initVirtualScroll(this._options);
            }
        }
    }

    /**
     * Обработатывает добавление элементов в коллекцию
     * @param addIndex
     * @param items
     * @private
     */
    private _itemsAddedHandler(addIndex: number, items: CollectionItem[]): void {
        const range = this._virtualScroll.insertItems(addIndex, items.length);
        this._options.collection.setViewIndices(range);
    }

    /**
     * Обрабатывает удаление элементов из коллекции
     * @param removeIndex
     * @param items
     * @private
     */
    private _itemsRemovedHandler(removeIndex: number, items: CollectionItem[]): void {
        const range = this._virtualScroll.removeItems(removeIndex, items.length);
        this._options.collection.setViewIndices(range);
    }

    /**
     * Обработчик на события Scroll.Watcher(видимость триггеров, изменение скролла, изменение скроллбара и пр.)
     * @param action
     * @param params
     */
    private _scrollEventHandler(action: string, params: IScrollEventParams): void {
        this[action](params);
    }

    /**
     * Обработчик изменения размера вьюпорта
     * @param params
     */
    private _viewportResize(params: IScrollEventParams): void {
        this._virtualScroll.resizeViewport(params.viewportHeight, Scroll.getItemsHeightsDataByContainer(this._children.itemsContainer));
        this._updateTriggerOffset(params.scrollHeight, params.viewportHeight);
    }

    /**
     * Обработчик смены размера контейнера с элементами
     */
    private _viewResize(params: IScrollEventParams): void {
        this._virtualScroll.resizeView(params.scrollHeight, Scroll.getItemsHeightsDataByContainer(this._children.itemsContainer));
        this._updateTriggerOffset(params.scrollHeight, params.viewportHeight);
    }

    /**
     * Обработчик на событие скролла
     */
    private _scrollPositionChanged(params: IScrollEventParams): void {
        this._scrollTop = params.scrollTop;
        const activeElementIndex = this._virtualScroll.getActiveElementIndex(
            this._scrollTop
        );

        const activeElementId = this._options.collection.getItemIdByIndex(activeElementIndex);
        this._notify('activeElementChanged', [activeElementId]);
    }

    /**
     * Обработчик на событие смещения скроллбара
     */
    private _scrollBarPositionChanged(params: IScrollEventParams): void {
        const range = this._virtualScroll.shiftRangeToScrollPosition(params.scrollTop);
        this._options.collection.setViewIndices(range);
    }

    /**
     * Обработчик на событие смены видимости триггера
     * @param triggerName
     * @param triggerState
     */
    private _triggerVisibilityChanged(triggerName: IDirection, triggerState: boolean): void {
        if (triggerState) {
            this._recalcToDirection(triggerName);
        }

        this._triggerVisibility[triggerName] = triggerState;
    }

    /**
     * Производит пересчет диапазона в переданную сторону
     * @param direction
     * @private
     */
    private _recalcToDirection(direction: IDirection): void {
        if (this._checkEdgeReached(direction)) {
            this._notifyLoadMore(direction);
        } else {
            const range = this._virtualScroll.shiftRange(direction);
            this._options.collection.setViewIndices(range);

            if (this._checkEdgeReached(direction)) {
                this._notifyLoadMore(direction);
            }
        }
    }

    /**
     * Проверяет что virtualScroll достиг края данных
     * @param direction
     * @private
     */
    private _checkEdgeReached(direction: IDirection): boolean {
        return this._virtualScroll.range.start === 0 && direction === 'up' ||
               this._virtualScroll.range.stop === this._options.collection.getCount() && direction === 'down';
    }

    /**
     * Нотифицирует о том, что нужно грузить новые данные
     * @param direction
     * @private
     */
    private _notifyLoadMore(direction: IDirection): void {
        this._notify('loadMore', [direction]);
    }

    /**
     * Обновляет позицию триггера
     * @param scrollHeight
     * @param viewportHeight
     * @private
     */
    private _updateTriggerOffset(scrollHeight: number, viewportHeight: number): void {
        this._triggerOffset = Scroll.calcTriggerOffset(scrollHeight, viewportHeight);
        this._virtualScroll.resizeTrigger(this._triggerOffset);
    }

    /**
     * Вычисляет позицию триггера
     * @param scrollHeight
     * @param viewportHeight
     */
    private static calcTriggerOffset(scrollHeight: number, viewportHeight: number): number {
        return (scrollHeight && viewportHeight ? Math.min(scrollHeight, viewportHeight) : 0) * 0.3;
    }

    /**
     * Вычисляет реальные высоты элемента
     * @param container
     */
    private static getItemsHeightsDataByContainer(container: HTMLElement): IItemsHeights {
        const itemsHeights = [];
        const itemsOffsets = [];

        let sum = 0;

        Array.prototype.forEach.apply(container.children, (item: HTMLElement, i) => {
            const itemHeight = item.getBoundingClientRect().height;

            itemsHeights[i] = itemHeight;
            itemsOffsets[i] = sum;

            sum += itemHeight;
        });

        return {
            itemsHeights,
            itemsOffsets
        }
    }
}