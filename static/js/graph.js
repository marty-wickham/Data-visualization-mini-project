queue()
    .defer(d3.csv, "data/Salaries.csv")                                     // Takes two arguments, format of the data, and path to the csv file
    .await(makeGraphs);                                                     // Takes the name of the function we want tot call when the data is downlaoded as an argument

function makeGraphs(error, salaryData) {                                    // Takes error and a variable that the data from the CSV file will be passed into by queue.js.
    var ndx = crossfilter(salaryData);                                      // Load our salaryData into our crossfilter()

    salaryData.forEach(function(d) {
        d.salary = parseInt(d.salary);
        d.yrs_service = parseInt(d["yrs.service"]);
        d.yrs_since_phd = parseInt(d["yrs.since.phd"]);                     // Renamed with underscores to remove the dots
    })

    show_discipline_selector(ndx);
    
    show_percentage_that_are_professors(ndx, "Female", "#percentage-of-women-professors");
    show_percentage_that_are_professors(ndx, "Male", "#percentage-of-men-professors");
    
    show_gender_balance(ndx);                                               // Pass the ndx variable, the crossfilter, to the function that's going to draw a graph.
    show_average_salaries(ndx);
    show_rank_distribution(ndx);
    
    show_service_to_salary_correlation(ndx);
    show_phd_to_salary_correlation(ndx);

    dc.renderAll();
}


function show_discipline_selector(ndx) {
    var dim = ndx.dimension(dc.pluck('discipline'));
    var group = dim.group();

    dc.selectMenu("#discipline-selector")
        .dimension(dim)
        .group(group);
}


function show_percentage_that_are_professors(ndx, gender, element) {
    var percentageThatAreProf = ndx.groupAll().reduce( 
            function (p, v) {
                if(v.sex === gender) {
                    p.count++;
                    if(v.rank === "Prof") {
                        p.are_prof++;
                    }
                }
                return p;
            },
            function (p, v) {
                if(v.sex === gender) {
                    p.count--;
                    if(v.rank === "Prof") {
                        p.are_prof--;
                    }
                }
                return p;
            },
            function () {
                return ({count: 0, are_prof: 0});
            }
        );
        
        dc.numberDisplay(element)
            .formatNumber(d3.format(".2%"))
            .valueAccessor(function(d){
                if(d.count == 0) {
                    return 0;
                } else {
                    return (d.are_prof / d.count);
                }
            })
            .group(percentageThatAreProf);
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


function show_service_to_salary_correlation(ndx) {
    
    var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["pink", "blue"]);
    
    var eDim = ndx.dimension(dc.pluck('yrs_service'));
    var compareDim = ndx.dimension(function(d) {
        return [d.yrs_service, d.salary, d.rank, d.sex]                                        // Used to plot the x and y co-ordinates
    });
    
    var experienceSalary = compareDim.group();
    
    var minExperience = eDim.bottom(1)[0].yrs_service;
    var maxExperience = eDim.top(1)[0].yrs_service;
    
    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minExperience, maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years of Service")
        .title(function(d) {
            return d.key[2] + " earned " + d.key[1];
        })
        .colorAccessor(function(d) {
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(compareDim)
        .group(experienceSalary)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
        
}


function show_phd_to_salary_correlation(ndx) {
    
    var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["pink", "blue"]);
    
    var pDim = ndx.dimension(dc.pluck('yrs_since_phd'));
    var phdDim = ndx.dimension(function(d) {
        return [d.yrs_since_phd, d.salary, d.rank, d.sex]                                        // Used to plot the x and y co-ordinates
    });
    
    var phdSalary = phdDim.group();
    
    var minPhd = pDim.bottom(1)[0].yrs_since_phd;
    var maxPhd = pDim.top(1)[0].yrs_since_phd;
    
    dc.scatterPlot("#phd-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minPhd, maxPhd]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years Since PhD")
        .title(function(d) {
            return d.key[2] + " earned " + d.key[1];
        })
        .colorAccessor(function(d) {
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(phdDim)
        .group(phdSalary)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
        
}







