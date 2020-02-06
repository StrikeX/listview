import controller from "../virtualscroll/controller";
import VirtualScroll from "../virtualscroll/controller";

describe('VirtualScroll', () => {
    describe('.resetRange', () => {
        describe('by index', () => {
            let instance: controller;
            beforeEach(() => {
                instance = new controller({pageSize: 5}, {});
            });
            it('from start', () => {
                assert.deepEqual({start: 0, stop: 5}, instance.resetRange(0, 10));
            });
            it('from middle', () => {
                assert.deepEqual({start: 3, stop: 8}, instance.resetRange(3, 10));
            });
            it('from ending', () => {
                assert.deepEqual({start: 5, stop: 10}, instance.resetRange(8, 10));
            });
            it('page size is more than items count', () => {
                assert.deepEqual({start: 0, stop: 3}, instance.resetRange(0, 3));
            });
        });
        describe('by item height property', () => {
            let instance: controller;
            let itemsHeights = {itemsHeights: [20, 30, 40, 50, 60, 70, 80, 90]};
            beforeEach(() => {
                instance = new controller({}, {viewport: 200});
            });
            it('from start', () => {
                assert.deepEqual({start: 0, stop: 6}, instance.resetRange(0, 8, itemsHeights));
            });
            it('from middle', () => {
                assert.deepEqual({start: 2, stop: 6}, instance.resetRange(2, 8, itemsHeights));
            });
            it('from ending', () => {
                assert.deepEqual({start: 4, stop: 8}, instance.resetRange(6, 8, itemsHeights));
            });
        });
    });
    describe('.shiftRangeToScrollPosition', () => {
        let instance: controller;
        beforeEach(() => {
            const instance = new controller({pageSize: 5}, {trigger: 10});
            instance.updateItems({itemsHeights: [20, 20, 20, 20, 20, 20, 20, 20]});
        });

        it('top position', () => {
            assert.equal({start: 0, stop: 5}, instance.shiftRangeToScrollPosition(0));
        });
        it('middle position', () => {
            assert.equal({start: 2, stop: 7}, instance.shiftRangeToScrollPosition(120));
        });
        it('end position', () => {
            assert.equal({start: 3, stop: 8}, instance.shiftRangeToScrollPosition(160));
        });
    });
    describe('.insertItems', () => {
        let instance;

        beforeEach(() => {
            instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
            instance.updateItems({itemsHeights: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], itemsOffsets: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540]});
            instance.resetRange(0, 10);
        });

        it('at begining', () => {
            assert.deepEqual({start: 0, stop: 7}, instance.insertItems(0, 2));
        });
        it('at middle', () => {
            assert.deepEqual({start: 0, stop: 7}, instance.insertItems(5, 2));
        });
        it('at ending', () => {
            assert.deepEqual({start: 0, stop: 6}, instance.insertItems(3, 1));
        });
    });
    describe('.removeItems', () => {
        let instance;

        beforeEach(() => {
            instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
            instance.updateItems({itemsHeights: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], itemsOffsets: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540]});
            instance.resetRange(0, 10);
        });

        it('at begining', () => {
            assert.deepEqual({start: 0, stop: 5}, instance.removeItems(0, 1));
        });
        it('at middle', () => {
            assert.deepEqual({start: 0, stop: 5}, instance.removeItems(3, 1));
        });
        it('at ending', () => {
            assert.deepEqual({start: 0, stop: 5}, instance.removeItems(5, 1));
        });
    });
    describe('.shiftRange', () => {
        const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
        instance.resetRange(0, 10);
        instance.updateItems({itemsHeights: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], itemsOffsets: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540]});

        it('to up', () => {
           assert.deepEqual({start: 1, stop: 6}, instance.shiftRange('up'));
        });
        it('to down', () => {
            assert.deepEqual({start: 0, stop: 5}, instance.shiftRange('down'));
        });
    });
    describe('._getItemsToHideQuantityToUp', () => {
        it('return correct value', () => {
            assert.equal(1, VirtualScroll._getItemsToHideQuantityToUp(
                {start: 0, stop: 15}, {viewport: 500, trigger: 100, scroll: 1200},
                {
                    itemsHeights: [80,80,80,80,80,80,80,80,80,80,80,80,80,80,80],
                    itemsOffsets: [0, 80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880, 960, 1040, 1120, 1200]
                }
            ));
        });
    });
    describe('._getItemsToHideQuantityToDown', () => {
        it('return correct value', () => {
            assert.equal(1, VirtualScroll._getItemsToHideQuantityToDown(
                {start: 0, stop: 15}, {viewport: 500, trigger: 100, scroll: 1200},
                {
                    itemsHeights: [80,80,80,80,80,80,80,80,80,80,80,80,80,80,80],
                    itemsOffsets: [0, 80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880, 960, 1040, 1120, 1200]
                }
            ));
        });
    });
    describe('.isItemInRange', () => {
        const instance = new controller({pageSize: 5}, {});
        instance.resetRange(0, 10);

        it('return correct value', () => {
            assert.isTrue(instance.isItemInRange(0));
            assert.isTrue(instance.isItemInRange(5));
            assert.isTrue(instance.isItemInRange(3));
            assert.isFalse(instance.isItemInRange(6));
        });
    });
    describe('.getPlaceholders', () => {
        it('after resetRange', () => {
            const instance = new controller({pageSize: 5}, {});
            instance.resetRange(0, 10);

            assert.deepEqual({top: 0, bottom: 0}, instance.getPlaceholders());
        });
        it('after shiftRange', () => {
            const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
            instance.resetRange(0, 10);
            instance.updateItems({itemsHeights: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], itemsOffsets: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540]});
            instance.shiftRange('down');

            assert.deepEqual({top: 60, bottom: 0}, instance.getPlaceholders());
            
            instance.shiftRange('up');

            assert.deepEqual({top: 0, bottom: 60}, instance.getPlaceholders());
        });
        it('after move to scroll position', () => {
            const instance = new controller({pageSize: 5}, {trigger: 10});
            instance.updateItems({itemsHeights: [20, 20, 20, 20, 20, 20, 20, 20]});
        
            instance.shiftRangeToScrollPosition(120);

            assert.deepEqual({top: 120, bottom: 0}, instance.getPlaceholders());
        });
    });
    describe('.isNeedToRestorePosition', () => {
        it('after reset range', () => {
            const instance = new controller({pageSize: 5}, {});
            instance.resetRange(0, 10);
            
            assert.isTrue(instance.isNeedToRestorePosition);
        });
        it('after shift range', () => {
            const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
            instance.resetRange(0, 10);
            instance.updateItems({itemsHeights: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], itemsOffsets: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540]});
            instance.shiftRange('down');

            assert.isTrue(instance.isNeedToRestorePosition);
        });
    });
    describe('.canScrollToItem', () => {
        const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
        instance.resetRange(0, 10);
        instance.updateItems({itemsHeights: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], itemsOffsets: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540]});
        
        
        it('can`t scroll', () => {
            assert.isFalse(instance.canScrollToItem(6), 'Item is out of range');
            assert.isFalse(instance.canScrollToItem(5), 'Item offset > viewport offset');
        });
        it('can scroll', () => {
            assert.isTrue(instance.canScrollToItem(0));
            instance.resetRange(0, 5);
            instance.updateItems({itemsHeights: [60,60,60,60,60], itemsOffsets: [0, 60, 120, 180, 240]});
            assert.isTrue(instance.canScrollToItem(5));
        });
    });
    describe('.getActiveElementIndex()', () => {
        it('no items', () => {
            const instance = new controller({}, {});

            assert.isUndefined(instance.getActiveElementIndex(0));
        });
        it('scrolled to bottom', () => {
            const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
            instance.resetRange(0, 5);
            instance.updateItems({itemsHeights: [60,60,60,60,60], itemsOffsets: [0, 60, 120, 180, 240]});

            assert.equal(4, instance.getActiveElementIndex(400));
        });
        it('scrolled to top', () => {
            const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
            instance.resetRange(0, 5);
            instance.updateItems({itemsHeights: [60,60,60,60,60], itemsOffsets: [0, 60, 120, 180, 240]});

            assert.equal(0, instance.getActiveElementIndex(0));
        });
        it('middle case', () => {
            const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
            instance.resetRange(0, 5);
            instance.updateItems({itemsHeights: [60,60,60,60,60], itemsOffsets: [0, 60, 120, 180, 240]});

            assert.equal(2, instance.getActiveElementIndex(2));
        });
    });
    describe('.getPositionToRestore()', () => {
        it('after reset', () => {
            const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
            instance.resetRange(0, 5);
            instance.updateItems({itemsHeights: [60,60,60,60,60], itemsOffsets: [0, 60, 120, 180, 240]});

            assert.equal(0, instance.getPositionToRestore(0));
        });
        it('after shift', () => {
            const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
            instance.resetRange(0, 10);
            instance.updateItems({itemsHeights: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], itemsOffsets: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540]});
            instance.shiftRange('down');

            assert.equal(60, instance.getPositionToRestore(0));
        });
    });
});
