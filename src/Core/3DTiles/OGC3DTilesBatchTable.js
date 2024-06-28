class OGC3DTilesBatchTable {
    constructor(batchTable) {
        this._batchTable = batchTable;

        this.batchLength = batchTable.batchSize;
    }

    getDataForBatchId(batchId) {
        const data = {
            batchTable: {},
        };

        this._batchTable.getKeys().forEach((key) => {
            if (key === 'extensions') {
                data.extensions = {};
            }

            data.batchTable[key] = this._batchTable.getData(key)[batchId];
        });
    }
}


export default OGC3DTilesBatchTable;

