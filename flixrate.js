(function($) {
	'use strict';

	var $body = $('body');
	$body.on('ratings.load',function(e, query) {
		var isTV = query['isTV']
		delete query['isTV']
		query['api_key']=localStorage['netflix-ratings-apikey']||'94351e0efb7713d0ad0f46078bff2b14'
		$.getJSON('https://api.themoviedb.org/3/search/'+(isTV?'tv':'movie'), query, function(data) {
			$body.trigger('ratings.return', [data]);
		});
	});

	var isDebug = localStorage['netflix-ratings-isDebug']||false;
	var $body = $('body');
	var lastTitle = "";

	//Taken from http://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
	function observeDOM() {
		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		var eventListenerSupported = window.addEventListener;

		return function(obj, callback) {
			if (MutationObserver) {
				// define a new observer
				var obs = new MutationObserver(function(mutations, observer) {
				if (mutations[0].addedNodes.length || mutations[0].removedNodes.length)
					callback();
				});
				// have the observer observe foo for changes in children
				obs.observe(obj, { childList:true, subtree:true });
			} else if (eventListenerSupported) {
				obj.addEventListener('DOMNodeInserted', callback, false);
				obj.addEventListener('DOMNodeRemoved', callback, false);
			}
		};
	}

	function addRating(results) {
		//Check if hover window is available
		var $hoverbox = $('div.bob-info-main');
		var $box;
		if ($hoverbox.length) {
			if (isDebug) {
				window.console.debug("Hover div detected");
			}
			$box = $hoverbox.find('.meta');
		} else {
			if (isDebug) {
				window.console.debug("No hover div detected");
			}

			$box = $('.jawBoneOpenContainer').length?$('.jawBoneOpenContainer').find('.meta'):$('.jawBone').find('.meta');
		}

		if($box.find('.imdb-rating').length > 0){
			var hasRating = true;
			// var myClass = $box.find('.imdb-rating').get(0).parent().attr("class");
			var myClass = $box.find('.imdb-rating').find('i').attr('class').split('-')[0]

		}

		$.each(results, function(index, result) {
			if (hasRating) {
				window.console.debug("Rating was already detected: " + myClass);
				// don't add a second IMDb
				return;
			}
			var $list = $('<span>', {
					'class': 'imdb-rating',
					'title': result.details || ''
			});
			$list.append('<i class="'+result.type+'-logo-medium">'+result.label+'</i>');
			$list.append('<strong>'+result.rating+'/10 ('+result.details+')</strong>');

			$list.appendTo($box);
		});
	}

	// shamelessly taken from http://stackoverflow.com/questions/4292320
	function htmlNumericEntityUnescape(string) {
		return string.replace(/&#([^\s]*);/g, function(match, match2) {return String.fromCharCode(Number(match2));});
	}

	//extract useful data from response from omdb
	var annotate = function(data) {
		var result = [];
		var hasTomatoeResult = false;
		if (data.tomatoMeter !== 'N/A') {
			hasTomatoeResult = true;
			result.push({
				type: 'themoviedb',
				label: 'The Movie DB',
				rating: +data.results[0].vote_average,
				//maxRating: 100,
				details: data.results[0].vote_count
			});
		}
		addRating(result);
	};

	var queries = [];
	function addQueries(description, year, isTV) {
		// TODO TV or MOVIE
		if (description && year) {
			queries.push(function() {
				return {
					query:			description,
					year:			year,
					isTV: isTV
				};
			});
		}

		if (description) {
			queries.push(function() {
				return {
					query:			description,
					isTV: isTV
				};
			});
		}

		if (isDebug) {
			window.console.log('queries:', queries.length);
		}
		//Get Ratings and stuff
		if (queries.length > 0) {
			fallbackQuery();
		}
	}

	function getReleaseInfo() {
		return {
			year: +$.trim($('span.year').text())
		};
	}

	function getMovieDescription() {
		var title = $('div.title.has-jawbone-nav-transition').clone();
		return $.trim(title.text());
	}

	function getIsTV(){
		return $('div.jawbone-overview-info.has-jawbone-nav-transition').find('.duration').text().includes('Season')
	}

	function getHasRating(){
		return $('.jawBoneOpenContainer').find('.meta').find('.imdb-rating').length>0
	}

	function fallbackQuery() {
		var curFn = queries.shift();
		if (typeof curFn === 'function') {
			var query = curFn();
			if (isDebug) {
				window.console.log('query', query);
			}
			$body.trigger('ratings.load', [query]);
		} else {
			window.console.error('Could not find any data');
			addRating([{
				type: 'themoviedb',
				label: 'The Movie DB',
				rating: '?',
				details: '?'
			}])
		}
	}

	$body.on('ratings.return', function(e, data) {
		data.results=data.results.filter(r=>r.vote_count>0)
		if (data.results.length>0) {
			queries = []; // we got a hit, so reset queries
			if (isDebug) {
				window.console.debug('success', data);
			}
			annotate(data);
		} else {
			if (isDebug && data.Error) {
				window.console.debug('error', data.Error);
			}
			fallbackQuery(queries);
		}
	});

	var description = getMovieDescription();
	var year = getReleaseInfo().year;
	var isTV = getIsTV();
	var hasRating = getHasRating();
	if (!hasRating){
		addQueries(description, year, isTV);
	}

	// Observe a specific DOM element if it exists:
	var $content = $('#appMountPoint');
	if ($content.length) {
		if (isDebug) {
			window.console.log('Found content node', $content);
		}
		observeDOM()($content.get(0), function() {
			if (isDebug) {
				window.console.log('Content changed');
			}
			//netflix dom allows diffrent dynamic element trees. check if hover div exists, or splitview (jawbone view)
			var $jawBoneDescription = ($('.jawBoneOpenContainer .jawBone').find("div.title").text() != "") ? $('.jawBoneOpenContainer .jawBone').find("div.title").text() : $('div.smallTitleCard.highlighted').attr("aria-label");
			var $jawBoneYear = $('.jawBoneOpenContainer .jawBone').find("span.year").text();
			var $isTV = $('.jawBoneOpenContainer .jawBone').find('.duration').text().includes('Season');
			var $hasRating = $('.jawBoneOpenContainer').find('.meta').find('.imdb-rating').length

			var $hoverBoxDescription = $('div.hasBob.smallTitleCard').find("div.bob-title").text();
			var $hoverBoxYear = $('div.hasBob.smallTitleCard').find("span.year").text();
			var $hoverIsTv = $('div.hasBob.smallTitleCard').find('.duration').text().includes('Season');
			var $hoverHasRating = $('div.hasBob.smallTitleCard').find('.meta').find('.imdb-rating').length

			//addqueries depending on dom-tree state
			if($jawBoneDescription != "" && $jawBoneDescription != null && !$hasRating)
			{
				addQueries($jawBoneDescription, $jawBoneYear, $isTV);
			}
			else if($hoverBoxDescription != "" && !$hoverHasRating)
			{
				addQueries($hoverBoxDescription, $hoverBoxYear, $hoverIsTv);
			}

		});
	}

})(window.jQuery);
