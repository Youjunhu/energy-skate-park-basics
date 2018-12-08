// Copyright 2018, University of Colorado Boulder

/**
 * ScreenView for the intro in Energy Skate Park: Basics
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var energySkateParkBasics = require( 'ENERGY_SKATE_PARK_BASICS/energySkateParkBasics' );
  var EnergySkateParkScreenView = require( 'ENERGY_SKATE_PARK/energy-skate-park/common/view/EnergySkateParkScreenView' );
  var inherit = require( 'PHET_CORE/inherit' );

  /**
   * @constructor
   * @param {EnergySkateParkIntroModel} model
   */
  function IntroScreenView( model, tandem ) {
    EnergySkateParkScreenView.call( this, model, tandem.createTandem( 'introScreenView' ), {
      includeMeasuringTapePanel: false,
      includeReferenceHeightCheckbox: false,

      includeMassSlider: true,
      includeGravitySlider: false
    } );
  }

  energySkateParkBasics.register( 'IntroScreenView', IntroScreenView );

  return inherit( EnergySkateParkScreenView, IntroScreenView );
} );