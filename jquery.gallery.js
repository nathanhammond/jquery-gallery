// Define our templates.
$.template('gallery.wrapper', '<ul class="gallery" style="width: ${width}px; height: ${height}px;">${content}</ul>');
$.template('gallery.wrapperitem', '<li style="width: ${scaledwidth}px; height: ${scaledheight}; border-bottom: ${scaledheight}px solid #000; margin-bottom: -${scaledheight}px; -webkit-transform-origin-y: ${transformOriginY}px;"><img src="${src}" width="${scaledwidth}" height="${scaledheight}" alt="${alt}"/></li>');
$.template('gallery.skirt', '<div class="skirt" style="height: ${height}px;"><div class="track"><div class="liner"></div><div class="slider"></div></div></div>');

(function( $ ) {
	var selectors = {
		gallery: '.gallery',
		galleryitems: '.gallery li',
		slider: '.slider',
		skirt: '.skirt',
		items: 'img'
	}
	var maxitemwidth, maxitemheight, galleryitemwidth, galleryheight;
	var initialized = false;			
	var galleryitems = [];
	var $current;

	var settings = {
		'width-ratio' : 2.5,
		'height-ratio' : 1.5,
		'transform-origin-ratio' : .675,
		'first-margin-ratio' : .685,
		'subsequent-margin-ratio' : .13
	};
	
	// Does all the math to identify the correct math values.
	function calculate() {
		// 'this' is the jQuery object for the container.
		maxitemwidth = this.width()/settings['width-ratio'];
		maxitemheight = this.height()/settings['height-ratio'];

		galleryitemwidth = maxitemwidth;
		galleryheight = 0;

		var length = galleryitems.length;

		// Calculate gallery item width.
		for (var i = 0; i < length; i++){
			// Figure out which dimension is going to require the most resizing.
			var scale = Math.min(maxitemwidth/galleryitems[i].width, maxitemheight/galleryitems[i].height, 1);

			galleryitemwidth = Math.min( scale * galleryitems[i].width, galleryitemwidth);
		}

		// Identify gallery item height now that we know the gallery item width.
		for (var i = 0; i < length; i++){
			// Figure out which dimension is going to require the most resizing.
			var scale = galleryitemwidth / galleryitems[i].width;			

			galleryheight = Math.max( scale * galleryitems[i].height, galleryheight );
			galleryitems[i].scaledwidth = galleryitemwidth;
			galleryitems[i].scaledheight = scale * galleryitems[i].height;
		}

		// Now that we know the max height, figure out the transformation origin for each.
		for (var i = 0; i < length; i++){
			galleryitems[i].transformOriginY = galleryitems[i].scaledheight - galleryheight + (settings['transform-origin-ratio'] * galleryheight);
		}
		
	}

	function draw() {
		// Only runs once!
		if (initialized) { return this; }
		var $gallery = this;
		initialized = true;

		// Build the images array.
		$items = this.find(selectors.items);

		// Store gallery item information.
		$items.each(function() {
			$this = $(this);

			var temp = new Image();
			var src = $this.attr('src');
			var alt = $this.attr('alt');

			temp.src = $this.attr('src');
			
			var height = temp.height;
			var width = temp.width;
		
			galleryitems.push({ height: height, width: width, src: src, alt: alt });
		});

		// Do all of our calculations.
		calculate.call(this);

		// Build our HTML.
		var gallerywrapper = $.tmpl('gallery.wrapper', { width: galleryitemwidth, height: galleryheight });
		var content = $.tmpl('gallery.wrapperitem', galleryitems);
		var skirt = $.tmpl('gallery.skirt', { height: galleryheight });

		// Add in our HTML.
		gallerywrapper.html(content);
		this.html(gallerywrapper).append(skirt);

		var startingpos = 0;

		// Build the slider, set the starting value.
		this.find(selectors.slider).slider({ max: $items.length-1, value: startingpos }).bind("slide", function(event, ui) {
			$gallery.gallery('value', ui.value);
		});

		// Set the starting position to the first element.
		this.gallery('value', startingpos);
		
		return this;
	}

	var methods = {
		init : function( options ) {
			if (initialized) { return this; }

			var $gallery = this;
			$.extend( settings, options );

			// Bind image clicks.
			this.delegate(selectors.items, 'click', function(e) {
				$gallery.gallery('value', $(this).closest('li'));
			});

			// Bind redraw to resize.
			$(window).bind('resize', function() {
				$gallery.gallery('redraw');
			});

			var $items = this.find(selectors.items);
			var length = $items.length;

			draw.call($gallery);
			
			// Make sure the images are loaded before running draw.
			// Following code from jquery.imagesLoaded.js
			// mit license. paul irish. 2010.
			/*
			$items.bind('load', function() {
				if (--length <= 0) { draw.call($gallery); }
			}).each(function() {
				if (this.complete || this.complete === undefined){
					var src = this.src;
					this.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
					this.src = src;
				}
			});
			*/

			return this;
		},
		redraw : function( ) {
			// Do all of our calculations.
			calculate.call(this);

			// Reset container size.
			this.find(selectors.gallery).css({ width: galleryitemwidth+'px', height: galleryheight+'px'});

			// Disable transitions, reset each li to be the correct size, re-enable transitions.
			this.find(selectors.galleryitems).css({ webkitTransition: 'none !important' }).each(function(i) {
				$(this).css({ width: galleryitems[i].scaledwidth+'px', height: galleryitems[i].scaledheight+'px', borderBottom: galleryitems[i].scaledheight+'px solid #000', marginBottom: '-'+galleryitems[i].scaledheight+'px', webkitTransformOriginY: galleryitems[i].transformOriginY+'px' });
				$(this).find(selectors.items).attr({ width: galleryitems[i].scaledwidth, height: galleryitems[i].scaledheight });
			}).css({ webkitTransition: '-webkit-transform .5s, left .5s' });

			// Adjust skirt height.
			this.find(selectors.skirt).css({ height: galleryheight+'px' });

			// Set the focus back to where we were already.
			this.gallery('value', $current[0]);

			return this;
		},
		value : function( galleryitem ) {
			if (typeof galleryitem == "number") {
				galleryitem = this.find('li')[galleryitem];
			} else if ( galleryitem == undefined ) {
				// Read the property.
				return $current.prevAll().length;
			}

			var $previous = $current;
			var $galleryitem = $(galleryitem);
			
			// Save the state globally.
			$current = $galleryitem;

			this.find(selectors.slider).slider('value', $galleryitem.prevAll().length);

			if ($previous) {
				$previous.removeClass('focus');
			}
			$galleryitem.addClass('focus');

			$galleryitem.prevAll().each(function(index) {
				$(this).css({
					left: (index * -settings['subsequent-margin-ratio'] * galleryitemwidth - settings['first-margin-ratio'] * galleryitemwidth)+'px',
					zIndex: (galleryitems.length - (index + 1)).toString()
				});
			});
			$galleryitem.css({
				left: '0px',
				zIndex: galleryitems.length.toString()
			});
			$galleryitem.nextAll().each(function(index) {
				$(this).css({
					left: (index * settings['subsequent-margin-ratio'] * galleryitemwidth + settings['first-margin-ratio'] * galleryitemwidth)+'px',
					zIndex: (galleryitems.length - (index + 1)).toString()
				});
			});

			return this;
		},
		prev : function( ) {
			return methods[ 'adjust' ].call( this, -1 );
		},
		next : function( ) {
			return methods[ 'adjust' ].call( this, 1 );
		},
		adjust : function( increment ) {
			if (!$current) return this;
			var direction = increment > 0;
			increment = Math.abs(increment);

			var image;

			if (direction) {
				// Look after.
				var after = $current.nextAll();
				image = after[increment-1];
			} else {
				// Look before.
				var before = $current.prevAll();
				image = before[increment-1];
			}
			if (image) {
				return methods[ 'value' ].call( this, image );
			} else {
				return this;
			}
		}
	};

	$.fn.gallery = function( method ) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.gallery' );
		}
	};
})( jQuery );

// TODO: Add in buttons for horizontal scrollbar.
// TODO: Support typical keyboard, mouse, and touch interactions.
// TODO: Come up with animation for browsers that don't support 3D.
// TODO: Add in loading animation for images.
// TODO: Make templates adjustable by changing selectors to be defined by variables.
// TODO: Debounce gallery resize.
// TODO: Force absolute minimum sizes.