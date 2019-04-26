var dataSource = dataSources.db;       
dataSource.autoupdate(null, function (err) {
    if(err) return cb(err);
    return cb();
});  