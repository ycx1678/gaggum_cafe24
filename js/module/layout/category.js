/**
 * 카테고리 마우스 오버 이미지
 * 카테고리 서브 메뉴 출력
 */

$(document).ready(function(){

    var methods = {
        aCategory    : [],
        aSubCategory : {},

        get: function()
        {
             $.ajax({
                url : '/exec/front/Product/SubCategory',
                dataType: 'json',
                success: function(aData) {

                    if (aData == null || aData == 'undefined') return;
                    for (var i=0; i<aData.length; i++)
                    {
                        var sParentCateNo = aData[i].parent_cate_no;

                        if (!methods.aSubCategory[sParentCateNo]) {
                            methods.aSubCategory[sParentCateNo] = [];
                        }

                        methods.aSubCategory[sParentCateNo].push( aData[i] );
                    }
					methods.print_cate();
					methods.print_cateAll();
                }
            });
        },

        getParam: function(sUrl, sKey) {

            var aUrl         = sUrl.split('?');
            var sQueryString = aUrl[1];
            var aParam       = {};

            if (sQueryString) {
                var aFields = sQueryString.split("&");
                var aField  = [];
                for (var i=0; i<aFields.length; i++) {
                    aField = aFields[i].split('=');
                    aParam[aField[0]] = aField[1];
                }
            }
            return sKey ? aParam[sKey] : aParam;
        },

        show: function(overNode, iCateNo) {
            if (methods.aSubCategory[iCateNo].length == 0) {
                return;
            }

            var aHtml = [];
            aHtml.push('<ul>');
            $(methods.aSubCategory[iCateNo]).each(function() {
                aHtml.push('<li><a href="/'+this.design_page_url+this.param+'">'+this.name+'</a></li>');
            });
            aHtml.push('</ul>');

            var offset = $(overNode).offset();
            $('<div class="sub-category"></div>')
                .appendTo(overNode)
                .html(aHtml.join(''))
                .find('li').mouseover(function(e) {
                    $(this).addClass('over');
                }).mouseout(function(e) {
                    $(this).removeClass('over');
                });
        },
        close: function() {
            $('.sub-category').remove();
        },
		
        print_cate: function() {

			$('#Category_Menu li').each(function() {

				var iCateNo = Number(methods.getParam($(this).find('a').attr('href'), 'cate_no'));
				var iCount = $(methods.aSubCategory[iCateNo]).length;
				if (iCount == 0) { return; }

				var aHtml = [];
				aHtml.push('<ul class="Category_Submenu">');
				$(methods.aSubCategory[iCateNo]).each(function() {
					aHtml.push('<li><a href="/'+this.design_page_url+this.param+'">'+this.name+'</a></li>');
				});
				aHtml.push('</ul>');
				$(aHtml.join('')).appendTo(this);

			});

        },
        print_cateAll: function() {

			$('#category_all li').each(function() {
				
				var aHtml = [];
				var dep = 2;
				var iCateNo = Number(methods.getParam($(this).find('a').attr('href'), 'cate_no'));
				var iCount = $(methods.aSubCategory[iCateNo]).length;
				$(this).addClass("cateMenu_1");
				if (iCount > 0) {
					aHtml = methods.Category_All_Call(aHtml,dep,iCateNo);
					$(aHtml.join('')).appendTo(this);
				} else {
					return;
				}

			});
        },
        Category_All_Call: function(aHtml,dep,iCateNo) {
			var nowClass = "cateDep_" + dep;
			var nowClassSub = "cateMenu_" + dep;
			aHtml.push('<ul class="'+nowClass+'">');

			$(methods.aSubCategory[iCateNo]).each(function() {
				
				var jCateNo = this.cate_no;
				var iCount = $(methods.aSubCategory[jCateNo]).length;

				aHtml.push('<li class="'+nowClassSub+'"><a href="/'+this.design_page_url+this.param+'">'+this.name+'</a>');
				
				/* 4뎁스까지만 처리 */
				if (iCount > 0 && dep < 4) {
					dep = dep + 1;
					aHtml = methods.Category_All_Call(aHtml,dep,jCateNo);
					dep = dep - 1;
				}

				aHtml.push('</li>');

			});
			
			aHtml.push('</ul>');

			return aHtml;

        }
    };

    methods.get();

	/*
    $('.xans-layout-category ul.Category_List li').mouseenter(function(e) {

		var $this = $(this).addClass('on'),
		iCateNo = Number(methods.getParam($this.find('a').attr('href'), 'cate_no'));
		if (!iCateNo) { return; }
		methods.show($this, iCateNo);

	}).mouseleave(function(e) {

		$(this).removeClass('on');
		methods.close();

	});*/

});