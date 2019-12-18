import {ICollectionCommand, ICommandEvent} from "../interfaces";
import {TKey, ICollection} from "../interfaces";

export interface IActionsItem {
    hoveredActions,
    menuActions//?????? нужно как-то передать данные в меню
}



/*
когда открывается меню itemActions - должна замереть строка
подготовить данные для открытия меню.
* */
export class Activate implements ICollectionCommand<IActionsItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IActionsItem>): void {
    }
}

/*
* по аналогии с Activate - Swipe активирует строку, но делает другое визуальное представление на анализе других данных
* */
export class Swipe implements ICollectionCommand<IActionsItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IActionsItem>): void {
    }
}

/*
* снимает активность строки
* */
export class Deactivate implements ICollectionCommand<IActionsItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IActionsItem>): void {
    }
}


/*
* кога меняется itemActions, itemActionVisibilityCallback или когда есть itemActionProperty и меняется коллекция
* */
export class Sync implements ICollectionCommand<IActionsItem> {
    constructor(private itemsActions, private itemActionsVisibilityCallback, itemActionProperty) {}

    execute(collection: ICollection<IActionsItem>): void {}
}
