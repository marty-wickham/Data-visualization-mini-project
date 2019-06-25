queue()
    .defer(d3.csv, "data/Salaries.csv")                                     // Takes two arguments, format of the data, and path to the csv file
    .await(makeGraphs);                                                     // Takes the name of the function we want tot call when the data is downlaoded as an argument

function makeGraphs(error, salaryData) {                                    // Takes error and a variable that the data from the CSV file will be passed into by queue.js.
    var ndx = crossfilter(salaryData);                                      // Load our salaryData into our crossfilter()

    salaryData.forEach(function(d) {
        d.salary = parseInt(d.salary);
    })

    show_discipline_selector(ndx);
    show_gender_balance(ndx);                                               // Pass the ndx variable, the crossfilter, to the function that's going to draw a graph.
    show_average_salaries(ndx);
    show_rank_distribution(ndx);

    dc.renderAll();
}


function show_discipline_selector(ndx) {
    var dim = ndx.dimension(dc.pluck('discipline'));
    var group = dim.group();

    dc.selectMenu("#discipline-selector")
        .dimension(dim)
        .group(group);
}


function show_gender_balance(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    var group = dim.group();

    dc.barChart("#gender-balance")
        .width(400)
        .height(300)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .dimension(dim)
        .group(group)
        .transitionDuration(500)                                         // How quickly the chart animates when we filter.
        .x(d3.scale.ordinal())                                           // Using ordinal scale as the dimension consists of the words male and female
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Gender")
        .yAxis().ticks(20);

}


function show_average_salaries(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));

    function add_item(p, v) {                                            // P is an accumulator that keeps track of the total, the count, and the average. // v represents each of the data items that we're adding or removing.
        p.count++;                                                       // If we add a new item, we want to increment the count in our p object           
        p.total += v.salary;                                             // Increment our total by the salary of the data item that we're looking at.                                   
        p.average = p.total / p.count;
        return p;
    }

    function remove_item(p, v) {
        p.count--;
        if (p.count == 0) {
            p.total = 0;
            p.average = 0;
        }
        else {
            p.total -= v.salary;
            p.average = p.total / p.count;
        }
        return p;
    }

    function initializer() {                                                // The initialise() function creates an initial value for p, and it doesn't take any arguments. // It needs to keep track of count, total, and average.
        return { count: 0, total: 0, average: 0 };
    }

    var averageSalaryByGender = dim.group().reduce(add_item, remove_item, initializer);

    dc.barChart("#average-salary")
        .width(400)
        .height(300)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .dimension(dim)
        .group(averageSalaryByGender)
        .valueAccessor(function(d) {                                         // The value that is being plotted here is the value created in the initialise() function of our custom reducer.
            return d.value.average.toFixed(2);                               // We need to write a value accessor to specify which of those 3 values actually gets plotted.
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}


function show_rank_distribution(ndx) {

    function rankByGender(dimension, rank) {
        return dimension.group().reduce(
            function(p, v) {
                p.total++;
                if (v.rank == rank) {
                    p.match++;
                }
                return p;
            },
            function(p, v) {
                p.total--;
                if (v.rank == rank) {                                        // We'll only decrement the match if the piece of data we're removing is a professor.
                    p.match--;
                }
                return p;
            },
            function() {                                                     // Initialise() function takes no arguments, but it creates the data structure that will be threaded through the calls to add_item() and remove_item().
                return ({ total: 0, match: 0 });
            }
        )
    }

    var dim = ndx.dimension(dc.pluck("sex"));
    var profByGender = rankByGender(dim, "Prof");
    var asstProfByGender = rankByGender(dim, "AsstProf");
    var assocProfByGender = rankByGender(dim, "AssocProf");

    dc.barChart("#rank-distribution")
        .width(400)
        .height(300)
        .dimension(dim)
        .group(profByGender, "Prof")
        .stack(asstProfByGender, "AsstProf")
        .stack(assocProfByGender, "AssocProfByGender")
        .valueAccessor(function(d) {
            if (d.value.total > 0) {
                return (d.value.match / d.value.total) * 100;
            }
            else {
                return 0;
            }
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({ top: 10, right: 100, bottom: 30, left: 30 })

}
