var
picoObj=require('pico/obj'),
showPage=function(self,curr){
	var pages=self.pages
	if (!pages || !pages.length) return
    self.signals.modal_pageCreate(curr,pages.length,pages[curr],function(title,form){
        var
        leftBtn=curr?{icon:'icon_prev'}:{icon:'icon_ko'},
        rightBtn=pages[curr+1]?{icon:'icon_next'}:{icon:'icon_ok'}

        self.signals.header(self.deps.paneId,title,leftBtn,rightBtn).send(self.header)
        self.signals.formShow(form).send(self.form)
		self.currentPage=curr
    }).send(self.sender)
},
collectResult=function(self,verify,cb){
    self.signals.formCollect(verify,function(err,data){
        if(err) return cb(err)
        picoObj.extend(self.data,data)
        self.signals.modal_pageResult(self.currentPage,self.pages.length,data,cb).send(self.sender)
    }).send(self.form)
},
changePage=function(self,next,verify){
	var pages=self.pages
	if (!pages || 0>next || (pages.length<=next)) return
	verify=undefined===verify?self.currentPage<next:verify
	collectResult(self,verify,function(err){
		if (err) return console.error(err)
		showPage(self,next)
	})
}

return {
    className: 'modal',
    deps:{
		Header:'view',
		Form:'view',
		paneId:'int'
	},
    signals:[
		'header',
		'layerShow','layerHide',
		'formShow','formCollect','formUpdate',
		'modal_pageCreate','modal_pageResult','modal_pageItemChange','modal_result'
	],
    create: function(deps){
		this.header=this.spawn(deps.Header)
		var
		self=this,
		sp=showPage

		showPage=function(s,c){ self.currentPage=c }
		this.form=this.spawn(deps.Form,null,null,false,function(){
			showPage=sp
			if (self.pages) showPage(self,self.currentPage)
		})
		this.sender=null
		this.pages=null
		this.pendingPages=null
		this.currentPage=0
		this.data=null
    },
    slots:{
        modal_show:function(from, sender, pages, page){
			this.sender=sender
			this.pages=pages
		    this.data={}
            this.signals.layerShow(1).send(this.host)
            showPage(this,undefined===page?0:page)
        },
        modal_hide:function(from, sender){
			this.sender=null
            this.signals.layerHide().send(this.host)
		},
		modal_pageChange:function(from, sender, nextPage, verify){
			changePage(this,nextPage,verify)
		},
		modal_collectPageResult:function(from, sender){
			collectResult(this,true,function(){})
		},
        formChange:function(from, sender, name, value){
            var self=this
            this.signals.modal_pageItemChange(name, value, function(name, value, options){
                self.signals.formUpdate(name,value,options).send(self.form)
            }).send(self.sender)
        },
		headerButtonClicked:function(from, sender, hash){
            var self=this
			switch(hash){
			case 'ok':
                collectResult(self,true,function(err){
                    if (err) return console.error(err)
					self.signals.modal_result(self.data).send(self.sender)
					self.signals.layerHide().send(self.host)
                })
				break
			case 'ko':
				this.signals.layerHide().send(this.host)
				break	
			case 'prev':
				changePage(self,self.currentPage-1)
				break	
			case 'next':
				changePage(self,self.currentPage+1)
				break	
			}
		}
    }
}
