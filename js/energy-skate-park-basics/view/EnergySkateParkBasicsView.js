// Copyright 2002-2013, University of Colorado Boulder

define( function( require ) {
  'use strict';

  // imports
  var Bounds2 = require( 'DOT/Bounds2' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Rectangle = require( 'SCENERY/nodes/Rectangle' );
  var Scene = require( 'SCENERY/Scene' );
  var ScreenView = require( 'JOIST/ScreenView' );
  var Text = require( 'SCENERY/nodes/Text' );
  var SkaterNode = require( 'ENERGY_SKATE_PARK/energy-skate-park-basics/view/SkaterNode' );

  function EnergySkateParkBasicsView( model, mvt ) {

    var thisView = this;
    ScreenView.call( thisView, { renderer: 'svg' } );

    //The background
    this.addChild( new Rectangle( 0, 0, this.layoutBounds.width, this.layoutBounds.height, {fill: 'yellow'} ) );

    //The skater
    this.addChild( new SkaterNode( model ) );
  }

  inherit( ScreenView, EnergySkateParkBasicsView );

  return EnergySkateParkBasicsView;
} );