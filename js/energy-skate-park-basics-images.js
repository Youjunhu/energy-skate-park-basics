// Copyright 2002-2013, University of Colorado Boulder

/**
 * Module that defines the image names and gets a getImage method once they are loaded.  See SimLauncher.
 * Makes it possible to load through the module system rather than passed as parameter everywhere or used as global.
 *
 * @author Sam Reid
 */
define( function() {
  'use strict';

  return {
    imageNames: [
      'barChartIcon.png',
      'close-button.png',
      'gridIcon.png',
      'house.png',
      'image001.gif',
      'image002.gif',
      'mountains.png',
      'Mouse_pointer_or_cursor.png',
      'pieChartIcon.png',
      'skater.png',
      'speedIcon.png'
    ]
  };
} );