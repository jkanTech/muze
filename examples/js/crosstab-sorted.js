/* eslint-disable */

(function () {
    let env = window.muze();
    const DataModel = window.muze.DataModel;

    d3.json('/data/cars.json', (data) => {
        let jsonData = data,
        schema = [{
        name: 'Name',
        type: 'dimension'
    }, {
        name: 'Maker',
        type: 'dimension'
    }, {
        name: 'Miles_per_Gallon',
        type: 'measure'
    }, {
        name: 'Displacement',
        type: 'measure'
    }, {
        name: 'Horsepower',
        type: 'measure'
    }, {
        name: 'Weight_in_lbs',
        type: 'measure'
    }, {
        name: 'Acceleration',
        type: 'measure'
    }, {
        name: 'Origin',
        type: 'dimension'
    }, {
        name: 'Cylinders',
        type: 'dimension'
    }, {
        name: 'Year',
        type: 'dimension',
        subtype: 'temporal',
        format: '%Y-%m-%d'
    }];
    const dm = new DataModel(jsonData, schema);
    const dm2 = dm.sort([
        ['Origin', 'desc'],
    ]);
    const canvas = env.canvas();
    
    canvas
        .data(dm)
        .width(550)
        .height(500)
        // .columns(['Horsepower', 'Origin', 'Maker'])
        // .rows(['Origin', 'Year', 'Maker'])
        .rows(['Origin', 'Year', 'Cylinders'])
        // .rows(['Maker', 'Year'])
        .columns(['Acceleration'])
        // .detail(['Name'])
        .mount('#chart')
    });
}());

