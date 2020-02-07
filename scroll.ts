import VirtualScroll from './virtualscroll/controller';
import {ICollection} from "./interfaces";
import {
    IDirection,
    IItemsHeights, IPlaceholders,
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

    private __mounted: boolean;

    private _lastScrollTop: number;

    private _restoreScrollResolve: Function;

    private _triggerOffset: number;

    protected _beforeMount(options: IOptions): void {
        this._initVirtualScroll(options);
    }

    protected _afterMount(): void {
        this.__mounted = true;
        this._observeScrollEvents();
    }

    protected _beforeUpdate(options: IOptions): void {
        if (options.collection !== this._options.collection) {
            this._initVirtualScroll(options);
        }
    }

    protected _afterRender(): void {
        if (this._virtualScroll.rangeChanged) {
            this._virtualScroll.updateItemsHeights(this._children.itemsContainer);
            this._virtualScroll.rangeChanged = false;
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
            return new Promise((resolve) => {
                if (this._virtualScroll.canScrollToItem(index)) {
                    this._scrollToPosition(this._virtualScroll.getItemOffset(index));
                    resolve();
                } else {
                    const rangeShiftResult = this._virtualScroll.resetRange(index, this._options.collection.getCount());
                    this._notifyPlaceholdersChanged(rangeShiftResult.placeholders);
                    this._options.collection.setViewIndices(rangeShiftResult.range);
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
        this._scrollToPosition(this._virtualScroll.getPositionToRestore(this._lastScrollTop));

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

        const rangeShiftResult = this._virtualScroll.resetRange(initialIndex, options.collection.getCount(), itemsHeights);
        this._notifyPlaceholdersChanged(rangeShiftResult.placeholders);
        options.collection.setViewIndices(rangeShiftResult.range);

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
        const rangeShiftResult = this._virtualScroll.insertItems(addIndex, items.length);
        this._notifyPlaceholdersChanged(rangeShiftResult.placeholders);
        this._options.collection.setViewIndices(rangeShiftResult.range);
    }

    /**
     * Обрабатывает удаление элементов из коллекции
     * @param removeIndex
     * @param items
     * @private
     */
    private _itemsRemovedHandler(removeIndex: number, items: CollectionItem[]): void {
        const rangeShiftResult = this._virtualScroll.removeItems(removeIndex, items.length);
        this._notifyPlaceholdersChanged(rangeShiftResult.placeholders);
        this._options.collection.setViewIndices(rangeShiftResult.range);
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
        this._updateTriggerOffset(params.scrollHeight, params.viewportHeight);
        this._virtualScroll.resizeViewport(params.viewportHeight, this._triggerOffset);
        this._virtualScroll.updateItemsHeights(this._children.itemsContainer);
    }

    /**
     * Обработчик смены размера контейнера с элементами
     */
    private _viewResize(params: IScrollEventParams): void {
        this._updateTriggerOffset(params.scrollHeight, params.viewportHeight);
        this._virtualScroll.resizeView(params.scrollHeight, this._triggerOffset);
        this._virtualScroll.updateItemsHeights(this._children.itemsContainer);
    }

    /**
     * Обработчик на событие скролла
     */
    private _scrollPositionChanged(params: IScrollEventParams): void {
        this._lastScrollTop = params.scrollTop;
        const activeElementIndex = this._virtualScroll.getActiveElementIndex(
            this._lastScrollTop
        );

        const activeElementId = this._options.collection.getItemIdByIndex(activeElementIndex);
        this._notify('activeElementChanged', [activeElementId]);
    }

    /**
     * Обработчик на событие смещения скроллбара
     */
    private _scrollBarPositionChanged(params: IScrollEventParams): void {
        const rangeShiftResult = this._virtualScroll.shiftRangeToScrollPosition(params.scrollTop);
        this._notifyPlaceholdersChanged(rangeShiftResult.placeholders);
        this._options.collection.setViewIndices(rangeShiftResult.range);
    }

    /**
     * Обработчик на событие смены видимости триггера
     * @param triggerName
     * @param triggerVisible
     */
    private _triggerVisibilityChanged(triggerName: IDirection, triggerVisible: boolean): void {
        if (triggerVisible) {
            this._recalcToDirection(triggerName);
        }

        this._triggerVisibility[triggerName] = triggerVisible;
    }

    /**
     * Производит пересчет диапазона в переданную сторону
     * @param direction
     * @private
     */
    private _recalcToDirection(direction: IDirection): void {
        if (this._virtualScroll.isRangeOnEdge(direction)) {
            this._notifyLoadMore(direction);
        } else {
            const rangeShiftResult = this._virtualScroll.shiftRange(direction);
            this._notifyPlaceholdersChanged(rangeShiftResult.placeholders);
            this._options.collection.setViewIndices(rangeShiftResult.range);

            if (this._virtualScroll.isRangeOnEdge(direction)) {
                this._notifyLoadMore(direction);
            }
        }
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
     * Нотифицирует о смене размера заглушек
     * @param placeholders
     * @private
     */
    private _notifyPlaceholdersChanged(placeholders: IPlaceholders): void {
        if (this.__mounted) {
            this._notify('placeholdersChanged', [placeholders]);
        }
    }

    /**
     * Обновляет позицию триггера
     * @param scrollHeight
     * @param viewportHeight
     * @private
     */
    private _updateTriggerOffset(scrollHeight: number, viewportHeight: number): void {
        this._triggerOffset = (scrollHeight && viewportHeight ? Math.min(scrollHeight, viewportHeight) : 0) * 0.3;
    }
}