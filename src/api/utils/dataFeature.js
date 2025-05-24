class DataFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
        this.filterQuery = {};
    }

    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'q'];
        excludedFields.forEach((field) => delete queryObj[field]);

        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
        this.filterQuery = JSON.parse(queryStr);

        this.filterQuery.deletedAt = null;

        this.query = this.query.find(this.filterQuery);
        return this;
    }

    search() {
        if(this.queryString.q){
            this.query = this.query.find({
                $text: { $search: this.queryString.q }
            })
        }
        return this;
    }

    sort(){
        if(this.queryString.sort){
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);

        }else{
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    paginate(){
        const page = parseInt(this.queryString.page) || 1;
        const limit = parseInt(this.queryString.limit) || 10;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit)
        return this
    }


}

export default DataFeatures;