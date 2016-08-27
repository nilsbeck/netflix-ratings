(function($) {
	'use strict';
	
	var $body = $('body');
	$body.on('ratings.load',function(e, query) {
		//originally needed for german amazon prime in prime-ratings
		//query.t = query.t
			// .replace('[dt./OV]', '')
			// .replace('[OV]', '')
			// .replace('[OV/OmU]', '');

		$.getJSON('https://www.omdbapi.com/', query, function(data) {
			$body.trigger('ratings.return', [data]);
		});
	});

	var isDebug = false;
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
			$box = $('.meta');
		} else {
			if (isDebug) {
				window.console.debug("No hover div detected");
			}
			
			$box = $('.jawBonePanes').find('.meta');
		}

		if($box.find('.imdb-rating').length > 0){
			var hasRating = true;
			var myClass = $box.find('.imdb-rating').get(0).parent().attr("class");
			
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
			$list.append('<strong>'+result.rating+'%</strong>');

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
		//I don't care for IMDb Ratings :)
		// if (data.imdbID && data.imdbRating !== 'N/A') {
			// result.push({
				// type: 'imdb',
				// label: 'IMDb',
				// rating: +data.imdbRating,
				// maxRating: 10,
				// details: null
			// });
		// }
		if (data.tomatoMeter !== 'N/A') {
			result.push({
				type: 'rottenCritic',
				label: 'Rotten Tomatoes Critic',
				rating: +data.tomatoMeter,
				//maxRating: 100,
				details: data.tomatoConsensus !== 'N/A' ? htmlNumericEntityUnescape(data.tomatoConsensus) : null
			});
		}
		if (data.rottenUser !== 'N/A') {
			result.push({
				type: 'rottenUser',
				label: 'Rotten Tomatoes User',
				rating: +data.tomatoUserMeter,
				//maxRating: 100,
				details: data.tomatoConsensus !== 'N/A' ? htmlNumericEntityUnescape(data.tomatoConsensus) : null
			});
		}
		addRating(result);
	};

	var queries = [];
	function addQueries(description, year) {
		if (description && year) {
			queries.push(function() {
				return {
					t:			description,
					y:			year,
					tomatoes:	true
				};
			});
		}

		if (description) {
			queries.push(function() {
				return {
					t:			description,
					tomatoes:	true
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
		}
	}

	$body.on('ratings.return', function(e, data) {
		if (data.Response === 'True') {
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
	addQueries(description, year);

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
			var $jawBoneDescription = ($('.jawBone').find("div.title").text() != "") ? $('.jawBone').find("div.title").text() : $('div.smallTitleCard.highlighted').attr("aria-label");
			var $jawBoneYear = $('.jawBone').find("span.year").text();
			var $hoverBoxDescription = $('div.hasBob.smallTitleCard').find("div.bob-title").text();
			var $hoverBoxYear = $('div.hasBob.smallTitleCard').find("span.year").text();
			
			//addqueries depending on dom-tree state
			if($jawBoneDescription != "" && $jawBoneDescription != null)
			{
				addQueries($jawBoneDescription, $jawBoneYear);
			}
			else if($hoverBoxDescription != "")
			{
				addQueries($hoverBoxDescription, $hoverBoxYear);
			}
			
		});
	}

})(window.jQuery);