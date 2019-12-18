import {ICollectionCommand, IListItem} from "../interfaces";
import {TKey, ICollection, ISelectionObject} from "../interfaces";

export interface ISelectionItem {
    selected: Boolean;
}

export class Sync implements ICollectionCommand<IListItem> {
    constructor(private selectedKeys: TKey[], private excludedKeys: TKey[]) {}

    execute(collection: ICollection<IListItem>): void {}
}

export class Toggle implements ICollectionCommand<ISelectionItem> {
    constructor(private selectedKeys: TKey[], private excludedKeys: TKey[], private key:TKey) {

    }
    execute(collection: ICollection<ISelectionItem>): void {
        //преключить selection
        return collection.applyCommand([new Sync(this.selectedKeys, this.excludedKeys)]);
    }
}
