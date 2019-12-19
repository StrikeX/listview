import VS from './virtualscroll/controller';
import scrollUtils from './virtualscroll/util';

interface IOptions {
    collection: ICollection;
}

interface IRange {
    start: number;
    stop: number;
}

class Scroll {
    protected _beforeMount(options): void {
        if (options.itemHeightProperty) {
            this.applyIndexes(VS.recalcFromItemHeightProperty(options.activeElement, this.heights));
        } else {
            this.applyIndexes(VS.recalcFromIndex(options.activeElement));
        }
    }

    protected _afterMount(): void {
        this.observeScrollEvents();
    }

    private applyIndexes(indexes): void {
        this._options.collection.applyIndexes(indexes);
    }

    private observeScrollEvents(): void {
        this._children.observer.start();
    }

    private scrollEventHandler(action: string, params: {scrollTop: number, scrollHeight: number, viewportHeight: number}): void {
        this.saveHeights(params);
        this[action](params);
    }

    private scrollMove(): void {
        this._notify('activeElementChanged', scrollUtils.getActiveElement(this.range, this.heights));
    }

    private scrollBarMove(): void {
        this.applyIndexes(VS.recalcFromScrollTop(this.heights));
    }

    private triggerVisibilityChanged(triggerName: string, triggerState: boolean): void {
        if (triggerState) {
            this.recalcToDirection(triggerName);
        }

        this.triggerVisibility[triggerName] = triggerState;
    }

    private recalcToDirection(triggerName): void {
        this.applyIndexes(VS.recalcToDirection(triggerName, this.range, this._options.segmentSize, this.heights));
    }

    scrollToItem(id: string): Promise<void> {
        return new Promise(resolve => {
            if (scrollUtils.canScrollToItem(getIndexById(id), this.range, this.heights)) {
                scrollToElement(element);
            } else {
                await this.applyIndexes(VS.recalcFromIndex(getIndexById(id)));
                resolve();
            }
        })
    }
}