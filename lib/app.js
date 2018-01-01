'use strict';

/*
globals d1 d3 DisplayGrades processGrades processAttend StudentReport PouchDB DisplayAttendance*/

let constants = {
    KeyDelim: '.',
    today: (new Date()).toISOString().substr(0,10),
};


let db = new PouchDB('grades',{
    auto_compaction: false, 
    //adapter:'websql',
});
//db.destroy();
let remoteCouch = false;




let app = {
    KeyDelim: constants.KeyDelim,
    config:{
        effective:constants.today,
        student:null,
        group:"logprog"
    },
    docsDiffer: function(origDoc, inputDoc){
        let oldDoc = JSON.clone(origDoc);
        let newDoc = JSON.clone(inputDoc);
        
        for(let field in oldDoc){
            if(field.substr(0,1) === '_'){
                delete oldDoc[field];
            }
        }
        for(let field in newDoc){
            if(field.substr(0,1) === '_'){
                delete newDoc[field];
            }
        }
        
        oldDoc = JSON.stringify(oldDoc);
        newDoc = JSON.stringify(newDoc);
        
        let rtn = oldDoc !== newDoc;
        return rtn;
    },
    parseDate: d3.timeParse("%Y-%m-%d"),
    formatDate: d3.timeFormat("%Y-%m-%d"),
    statuses:{
        fail:{
            color:'black',
            name:'fail',
            css:'alert-fail'
        },
        warn:{
            color:'darkorange',
            name:'warn',
            css:'alert-warn'
        },
        danger:{
            color:'firebrick',
            name:'danger',
            css:'alert-danger'
        },
        success:{
            color:'darkgreen',
            name:'success',
            css:'alert-success'
        },
    },
    RedrawData: function(options){
		options = JSON.clone(options || {});
        DisplayGrades(options);
        DisplayAttendance(options);
        DisplayGradeAttend(options);
        DisplayStudent(options);
        DisplaySummary(options);
    },
    init: function(){
        db.upsert('_design/metrics',function(oldDoc){
            console.debug('Generating database views...');
            let newDoc = {};
            newDoc.views = StudentReport.metrics.views;
            if(!app.docsDiffer(oldDoc,newDoc)) {
                console.log('metrics calculations: current');
                return false;
            }
            console.log('metrics calculations: rebuilding (change detected)');
            return newDoc;
                    
        }).then(function(){
            db.changes({
                since: 'now',
                live: true,
                include_docs: true
            }).on('change', function() {
				app.initOptions();
                app.RedrawData();
            }).on('error', function (err) {
                console.log(err);
            });
            app.RedrawData();
        })
        .catch(function(err){
            console.log(err);
        });

    },
    initOptions: function(){
        
        // *** Fill the student dropdown ***
        let opts = {
            //reduce:false,
            //include_docs:true
            group:true,
            group_level:1,
            //startkey:['logprog'],
            //endkey:['logprog',{}],
        };
		
		
		db.query('metrics/courses', opts)
			.then( function(result){
				if(result.rows.length <= 0) return;
				let courseSelect = d1.querySelector('#course');
				let course = courseSelect.value;
				courseSelect.innerText = '';
				result.rows
					.map(function(d){
						let rtn = d.key;
						return rtn;
					})
					.sort()
					.forEach(function(d,i){
						let opt = d1.createElement('option');
						opt.innerText = d;
						opt.value = d;
						if (d === course){
							opt.selected = true;
							app.config.group = course;
							course = null;
						}
						courseSelect.append(opt);
					})
					;
				d1.querySelector('#courseNames').innerHTML = courseSelect.innerHTML;
				if(course !== null){
					app.config.group = courseSelect.value;
					app.RedrawData();
				}
			});
	},

};
