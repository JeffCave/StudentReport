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
        			    rates = result.rows.reduce(function(a,d){
        			        let key = d.key[1];
        			        a[key] = a[key] || {
        			            attendance:0,
        			            grade:0,
        			        };
        			        a[key].grade = d.value.pct;
        			        return a;
        			    },rates)
        			    
						if(!rates[params.student]) return;
        			    let current = JSON.clone(rates[params.student]);
        			    
        			    rates = Object.entries(rates).reduce(function(a,d){
        			        let key = JSON.stringify([
        			                Math.round(10*d[1].grade)/10,
        			                Math.round(10*d[1].attendance)/10
        			            ]);
        			        a[key] = (a[key] || 0) + 1;
        			        return a;
        			    },{});
        			    rates = Object.entries(rates).map(function(d){
        			        let rtn = JSON.parse(d[0])
        			        rtn = {
        			            grade: rtn[0],
        			            attendance: rtn[1],
        			            qty:d[1]
        			        }
        			        return rtn;
        			    });
        			    
        			    /******************************************/
        			    // set the dimensions and margins of the graph
                        let margin = {top: 30, right: 30, bottom: 30, left: 30},
                            width = 480 - margin.left - margin.right,
                            height = 480 - margin.top - margin.bottom;
                        
                        // set the ranges
                        let x = d3.scaleLinear().range([0, width]);
                        let y = d3.scaleLinear().range([height, 0]);
                        
                        // append the svg obgect to the body of the page
                        // appends a 'group' element to 'svg'
                        // moves the 'group' element to the top left margin
                        let svg = d1.querySelector("#studentdata svg");
                        if(svg){
                            svg.parentNode.removeChild(svg);
                        }
                        svg = d3.select("#studentdata")
                            .append("svg")
                                .attr("width", width + margin.left + margin.right)
                                .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                                .attr("transform","translate(" + margin.left + "," + margin.top + ")");
                        
                        // Scale the range of the data
                        x.domain([0,1]);
                        y.domain([0,1]);
                        
                        // Add the X Axis
                        svg.append("g")
                            .attr("transform", "translate(0," + height + ")")
                            .call(d3.axisBottom(x));
                    
                        // Add the Y Axis
                        svg.append("g")
                            .call(d3.axisLeft(y));
                        
                        // Add the scatterplot
                        svg.selectAll("circle")
                            .data(rates)
                            .enter()
                                .append("circle")
                                  .attr("r",function(d){
                                      return 3+(d.qty*2);
                                  })
                                  .attr("cx", function(d) {
                                      return x(d.attendance); 
                                  })
                                  .attr("cy", function(d) {
                                      return y(d.grade); 
                                  })
                                  .attr("style","fill:#888888;fill-opacity:1")
                                  ;
                        let curMarker = svg.selectAll("ellipse")
                            .data([current])
                            ;
                        curMarker
                            .enter()
                                .append("ellipse")
                                    .attr("rx",6)
                                    .attr("ry",6)
                                    .attr("style",'fill:dodgerblue;stroke:black;stroke-width:1;')
                            .merge(curMarker)
                                .attr("cx", x(Math.round(10*current.attendance)/10))
                                .attr("cy", y(Math.round(10*current.grade)/10))
                                ;
                    
        			    /******************************************/
        			    
        			    
        			});
			    
			});

	},1000);
	
}
