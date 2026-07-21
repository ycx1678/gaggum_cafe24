
function toggleClass(element, handler, className){
	var _handler = document.querySelector(handler);
	var _element = document.querySelector(element);

    _handler.addEventListener('click', function(){
        if ( _element.classList.contains(className) ) {
            _element.classList.remove( className );
        } else {
            _element.classList.add( className );
        }
    });
}


function handleNav() {
    var btnNavs = document.querySelectorAll('.eNavFold');
    var btnClose = document.querySelector('#aside .btnClose');
    var dimmed = document.querySelector('#layoutDimmed');
    var elements = document.getElementsByClassName("test");
    btnNavs.forEach( function(btnNav) {
        btnNav.addEventListener('click', function(){
            document.body.classList.add('expand');
        });
    });
    btnClose.addEventListener('click', function(){
        document.body.classList.remove('expand');
    });
    handleDimmed(dimmed, document.body, 'expand');
}


function searchLayer() {
    var btnSearchs = document.querySelectorAll('.eSearch');
    var btnClose = document.querySelector('.xans-layout-searchheader  .btnClose');
    btnSearchs.forEach( function(btnSearch) {
        btnSearch.addEventListener('click', function(){
            document.body.classList.add('searchExpand');
            var input = document.querySelector('#keyword');
            //input.focus();
        });
    });
    btnClose.addEventListener('click', function(){
        document.body.classList.remove('searchExpand');
    });
    var dimmed = document.querySelector('#layoutDimmed');
    handleDimmed(dimmed, document.body, 'searchExpand');
}

function handleDimmed(target, element, className){
    target.addEventListener('click', function(){
        element.classList.remove(className);
    });
}


function getOffset(element){
    if (!element.getClientRects().length)
    {
      return { top: 0, left: 0 };
    }

    var rect = element.getBoundingClientRect();
    var win = element.ownerDocument.defaultView;
    return (
    {
      top: rect.top + win.pageYOffset,
      left: rect.left + win.pageXOffset
    });
}

function getQuickPosition(){
	var role = document.querySelector("meta[name='path_role']").getAttribute('content');
	if (role === "MAIN") {
		return getMainQuickPosition();
	} else {
		return getSubQuickPosition();
	}
}

jQuery(document).ready(function() {

	/* morenvy.com 로그인폼 placeholder 추가 - 서정환 */
	if (jQuery('.xans-member-login').val() != undefined) {
		jQuery('#member_passwd').attr('placeholder', '비밀번호');
	}

	/* morenvy.com 비회원 주문조회페이지 placeholder 추가 - 서정환 */
	setTimeout(function(){
		if (jQuery('.xans-myshop-orderhistorynologin').val() != undefined) {
			jQuery('#order_name').attr('placeholder', '주문자명');
			jQuery('#order_id').attr('placeholder', '주문번호(하이픈(-) 포함)');
			jQuery('#order_password').attr('placeholder', '비회원주문 비밀번호');
		}
	}, 100);

	/* morenvy.com 검색페이지 인풋박스에서 텍스트 삭제 - 서정환 */
	jQuery('#ec-product-searchdata-searchkeyword_form').find('button.btnDelete').bind('click', function() {
		jQuery('#ec-product-searchdata-keyword').val('').focus();
	});

	/* morenvy.com 멀티샵 없을경우 숨김 */
	jQuery(".xans-layout-multishoplist").each(function(){
		var multishoplist_count = jQuery('li', this).length;
		if ( multishoplist_count == 1 ) {
			jQuery(this).hide();
		}
	});

	/* morenvy.com 하단 에스크로 사용하면 출력 */
	jQuery("#footer .inner .bt_escrow").each(function(){
		var bt_escrow = jQuery(this).attr("data-ez-escrow");
		if ( !bt_escrow == '' ) {
			var bt_escrow_name = jQuery("a img[data-ez-escrow-id="+ bt_escrow +"]", this).addClass('on');
			jQuery(this).css('display','flex');
		}
	});

	/* morenvy.com 로그인페이지 SNS 사용하면 출력 */
	jQuery(".xans-member-login .login__sns .wrap_sns_log a").each(function(){
		var wrap_sns_log = jQuery(this).hasClass('displaynone');
		if( wrap_sns_log == false){
			jQuery(".xans-member-login .login__sns").css('display','block');
		}
	});


	/* morenvy.com 모바일에서 쇼핑큐레이션 */
	jQuery('#shoppQbtn').click(function(){
		if (jQuery("#searchContent.xans-product-searchdata").is(":hidden")) {
			jQuery('#searchContent.xans-product-searchdata').slideDown('normal');
			jQuery(this).text('상세검색 닫기');
			jQuery(this).css('margin-top','0');
		} else {
			jQuery('#searchContent.xans-product-searchdata').slideUp('normal');
			jQuery(this).text('상세검색');
		}
	});

	/* morenvy.com 모바일에서 쇼핑큐레이션 없을시 버튼 숨김 */
	jQuery("#searchContent").each(function(){
		var prdCount_count = jQuery("#ec-searchdata-area", this).length;
		if ( prdCount_count == '0' ) {
			jQuery('#shoppQbtn').hide();
		}
	});

	/* morenvy.com 마이페이지 나의게시글 없을때 메시지 표시 */
	jQuery(".xans-myshop-boardpackage").each(function(){
		var boardlist = jQuery(".xans-myshop-boardlist table", this).length;
		if ( boardlist == '0' ) {
			jQuery('.myshop_boardlist_empty').css('display','flex');
		}
	});

	/* morenvy.com 더보기 클릭시 */
	jQuery('.btnMore').click(function(){
		setTimeout(function(){
			ifmore();
		},600)
	});
	setTimeout(function(){
		ifmore();
	},300)

	/* morenvy.com 상단 카테고리 변경 감지 */
	top_category(); // 상단카테고리
	jQuery('#header .xans-layout-category > ul').on('DOMSubtreeModified', function() {
		top_category();
	});
});

/* morenvy.com 상단 카테고리 */
function top_category(){
	/* morenvy.com 상단카테고리 */
	jQuery('#header .top_category li').mouseenter(function(e) {
		var $this = jQuery(this).addClass('on')
	}).mouseleave(function(e) {
		jQuery(this).removeClass('on');
	});

	/* morenvy.com 상단카테고리 중분류체크 */
	jQuery('#header .top_category ul.sub_cate01 li').each(function() {
		if (jQuery(this).children('ul').length == 0) {
			jQuery(this).addClass('noChild');
		}
	});
}

/* morenvy.com 최상단배너 쿠키 스크립트 - 서정환 */
function setCookiem(cookie_name, cookie_value, expire_date) {
    var today = new Date();
    var expire = new Date();
    expire.setTime(today.getTime() + 3600000 * 24 * expire_date);
    cookies = cookie_name + '=' + cookie_value + '; path=/;';
    if (expire_date != 0) cookies += 'expires=' + expire.toGMTString();
    document.cookie = cookies;
}

function delCookiem(cookie_name) {
	var _today = new Date();
	var value = '';
	_today.setDate(_today.getDate() - 1);
	document.cookie = cookie_name + "=" + value + '; path=/;' + "; expires=" + _today.toGMTString();
}

function getCookiem(name) {
    lims = document.cookie;
    var index = lims.indexOf(name + "=");
    if (index == -1) {
        return null;
    }
    index = lims.indexOf("=", index) + 1; // first character
    var endstr = lims.indexOf(';', index);
    if (endstr == -1) {
        endstr = lims.length; // last character
    }
    return unescape(lims.substring(index, endstr));
}

/* morenvy.com 더보기 클릭시 */
function ifmore(){
	/* morenvy.com 상품 썸네일 관심상품 출력 & 숨김 */
	setTimeout(function(){
		jQuery('.ec-base-product .prdList .icon__box .wish').each(function(){
			var isstatus = jQuery(this).children('img').attr('icon_status');
			if ( isstatus == 'on' ) {
				jQuery(this).addClass('on');
			}
		});
		jQuery('.ec-base-product .prdList .icon__box .wish').click(function(){
			var isstatus = jQuery(this).children('img').attr('icon_status');
			if ( isstatus == 'off' ) {
				jQuery(this).addClass('on');
			} else {
				jQuery(this).removeClass('on');
			}
		});
	},200)
	jQuery('.ec-base-product .prdList > li').each(function(){
		/* morenvy.com 상품진열 장바구니 사용안할시 숨김 */
		if (jQuery(".icon__box .cart > .ec-admin-icon", this).length == 1) {
		} else {
			jQuery('.icon__box .cart', this).hide();
		}
		/* morenvy.com 상품진열 옵션미리보기 사용안할시 숨김 */
		if (jQuery(".icon__box .option > a", this).length == 1) {
		} else {
			jQuery('.icon__box .option', this).hide();
		}
		/* morenvy.com 상품진열 관심상품 사용안할시 숨김 */
		if (jQuery(".icon__box .wish > .ec-product-listwishicon", this).length == 1) {
		} else {
			jQuery('.icon__box .wish', this).hide();
		}
	});
}