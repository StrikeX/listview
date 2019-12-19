interface IOptions {
    source: ISource
}

class Loader {
    protected _collection: ICollection;
    protected _beforeMount(options: IOptions): Promise {
        return options.source.query()
            .then((data) => {
                this._collection = new Collection(data);
            })
    }
}