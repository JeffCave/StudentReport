/* global moment */
'use strict';

let DisplayGradeAttend_pending = false;
function DisplayGradeAttend(force){
	let override = force || false;
	if(override){
		DisplayGradeAttend_pending = false;
	}
	if(DisplayGradeAttend_pending){
		return;
	}
	DisplayGradeAttend_pending = true;
	
	setTimeout(function(){
	    let params = app.config;

		let opts = {
		    //reduce:false,
		    //include_docs:true,
			group:true,
			group_level:2,
			startkey:['logprog'],
			endkey:['logprog',{}],
		};
		db.query('metrics/attendance', opts)
			.then( function(result){
		        DisplayGradeAttend_pending = false;
			    let rates = result.rows.reduce(function(a,d){
			        a[d.key[1]] = {
			            attendance: d.value.sum/d.value.count,
			            grade: 0,
		            }
			        return a;
		        },{});
			    
        		let opts = {
        		    //reduce:false,
        		    //include_docs:true,
        			group:true,
        			group_level:2,
        			startkey:['logprog'],
        			endkey:['logprog',{}],
        		};
        		db.query('metrics/gradesByDate', opts)
        			.then( function(result){
        			    rates = Object.entries(result.rows.reduce(function(a,d){
        			        let key = d.key[1];
        			        a[key] = a[key] || {
        			            attendance:0,
        			            grade:0,
        			        };
        			        a[key].grade = d.value.pct;
        			        return a;
        			    },rates))
        			    .map(function(d){
        			        d[1].id = d[0];
        			        return d[1];
        			    });
        			    
        			    /******************************************/
        			    // set the dimensions and margins of the graph
                        var margin = {top: 20, right: 20, bottom: 30, left: 50},
                            width = 960 - margin.left - margin.right,
                            height = 500 - margin.top - margin.bottom;
                        
                        // set the ranges
                        var x = d3.scaleLinear().range([0, width]);
                        var y = d3.scaleLinear().range([height, 0]);
                        
                        // append the svg obgect to the body of the page
                        // appends a 'group' element to 'svg'
                        // moves the 'group' element to the top left margin
                        var svg = d3.select("#studentdata")
                            .append("svg")
                                .attr("width", width + margin.left + margin.right)
                                .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                                .attr("transform","translate(" + margin.left + "," + margin.top + ")");
                        
                        // Scale the range of the data
                        x.domain([0,1]);
                        y.domain([0,1]);
                        
                        // Add the scatterplot
                        svg.selectAll("circle")
                            .data(rates)
                            .enter()
                                .append("circle")
                                  .attr("r", function(d){
                                      //return (params.student == d.id) ? '6' : '5';
                                      return 6;
                                  })
                                  .attr("cx", function(d) {
                                      return x(d.grade); 
                                  })
                                  .attr("cy", function(d) {
                                      return y(d.attendance); 
                                  })
                                  .attr("fill", function(d) {
                                      let color = 'black';
                                      if(params.student == d.id){
                                          color = 'dodgerblue';
                                      }
                                      return color; 
                                  })
                                  .attr("fill-opacity",function(d){
                                      let color = 0.5;
                                      if(params.student == d.id){
                                          color = 1;
                                      }
                                      return color;
                                  })
                                  .attr('stroke',function(d){
                                      return (params.student == d.id) ? 'black' : '';
                                  })
                                  .attr('stroke-width',function(d){
                                      return (params.student == d.id) ? '2' : '';
                                  })
                                  ;
                    
                        // Add the X Axis
                        svg.append("g")
                            .attr("transform", "translate(0," + height + ")")
                            .call(d3.axisBottom(x));
                    
                        // Add the Y Axis
                        svg.append("g")
                            .call(d3.axisLeft(y));
                        
        			    /******************************************/
        			    
        			    
        			});
			    
			});

	},1000);
	
}
