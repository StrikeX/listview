export class Promise<T>{
    constructor(callback: any){};
    then(callback: any){};
};

export type TKey = Number | String | null;


export interface IActionsItem {
    active: Boolean;
}

export declare type CollectionEachCallback = (item:any) => void

export interface ICollection<T> {
    each(callback: CollectionEachCallback): void;
    applyCommand<T>(commands: ICollectionCommand<T>[]): void;

}

export interface ISource {
    create(): Promise<TKey>;
    read(key:TKey): Promise<TKey>
    update(key: TKey): Promise<Boolean>;
    remove(key: TKey): Promise<Boolean>
}
export interface ISelectionObject {
    selectedKeys: Array<TKey>;
    excludedKeys: Array<TKey>;
}

export interface ICommandEvent {

}




export interface ICollectionCommand<T> {
    execute(collection: ICollection<T>): void;
}

export interface IListItem {
    key: TKey;
}