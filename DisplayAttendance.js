/**
 * https://strongriley.github.io/d3/ex/calendar.html
 * https://bl.ocks.org/micahstubbs/89c6bd879d64aa511372064c6cf85711
 */
'use strict';

let DisplayAttendance_pending = false;
function DisplayAttendance(override){
	override = override || false;
	if(override){
		DisplayAttendance_pending = false;
	}
	if(DisplayAttendance_pending){
		return;
	}
	DisplayAttendance_pending = true;
	
	setTimeout(function(){
		let opts = {
		    //reduce:false,
		    //include_docs:true,
			group:true,
			group_level:5,
			startkey:['logprog','W0000002'],
			endkey:['logprog','W0000002',{}],
		};
		db.query('metrics/attendance', opts)
			.then( function(result){
				DisplayAttendance_pending = false;
				// Adds the svg canvas
				
				let min = moment("3000-12-31");
				let max = moment(0);
                let data = result.rows
                    .filter(function(d){
                        return !isNaN(d.value.sum);
                    })
                    .map(function(d){
                        let rtn = {
                            key:JSON.clone(d.key).slice(2,5).join('-'),
                            value: d.value.sum,
                        };
                        rtn.date = moment(rtn.key);
                        if(rtn.date.diff(min) < 0){
                            min = rtn.date;
                        }
                        if(rtn.date.diff(max) > 0){
                            max = rtn.date;
                        }
                        return rtn;
                    })
                    ;
                
                let gridRange = {
                    start:min.clone().day(0),
                    finish:max.clone().day(6),
                };
                gridRange.weeks = gridRange.finish.diff(gridRange.start,'weeks')
                
                let table = d1.querySelector("#studentattendace > table");
                if(!table){
                    table = d1.createElement("table");
                    let html = Array(gridRange.weeks)
                        .fill("<td><span>&#9724;</span></td>")
                        .join('')
                        ;
                    html = Array(7).fill(html).join('</tr><tr>');
                    table.innerHTML = html;
                    d1.querySelector("#studentattendace").appendChild(table);
                    for(let r=table.rows.length-1; r>=0; r--){
                        let row = table.rows[r];
                        for(let c=row.cells.length-1; c>=0; c--){
                            let cell = row.cells[c];
                            
                            let day = c + (r*row.cells.length);
                            day = gridRange.start.clone().add(day,'days');
                            cell.setAttribute('title',day.format('Y-m-d'));
                            
                            cell.style.backgroundColor = "lightgray";
                            cell.style.color = "lightgray";
                            
                        };
                    };

                }
                
                data.forEach(function(d){
                   let week = d.date.diff(gridRange.start,'weeks');
                   let day = d.date.day();
                   let cell = table.rows[day].cells[week]
                   cell.style.backgroundColor = d.value ? "firebrick" : "darkgreen";
                   cell.style.color = d.value ? "firebrick" : "darkgreen";
                   //cell.setAttribute('title',d.key);
                });
			})
			.catch(function(err){
				console.log(err);
			});
		
		opts = {
		    //reduce:false,
		    //include_docs:true,
			group:true,
			group_level:2,
			startkey:['logprog','W0000002'],
			endkey:['logprog','W0000002',{}],
		};
		db.query('metrics/attendance', opts)
			.then( function(result){
			    let rec = result.rows[0].value;
			    let text = (rec.sum * 100.0 / rec.count).toFixed(1);
                d1.querySelector("#studentattendace summary span").innerText = text;
			});

	},1000);
}