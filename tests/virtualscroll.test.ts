import controller from "../virtualscroll/controller";
import VirtualScroll from "../virtualscroll/controller";

describe('VirtualScroll', () => {
    describe('.createNewRange', () => {
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
    describe('.moveToScrollPosition', () => {
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
    describe('.addItems', () => {
        const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
        instance.updateItems({itemsHeights: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], itemsOffsets: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540]});
        instance.resetRange(0, 10);

        it('recalc works correctly', () => {
            assert.deepEqual({start: 8, stop: 12}, instance.insertItems(10, 2));
        });
    });
    describe('.removeItems', () => {
        const instance = new controller({pageSize: 5, segmentSize: 1}, {viewport: 200, trigger: 10, scroll: 600});
        instance.updateItems({itemsHeights: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], itemsOffsets: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540]});
        instance.resetRange(0, 10);

        it('recalc works correctly', () => {
            assert.deepEqual({start: 0, stop: 5}, instance.removeItems(6, 2));
        });
    });
    describe('.moveToDirection', () => {
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
        ...
    });
    describe('._getItemsToHideQuantityToDown', () => {
        ...
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
});
