// Copyright 2013-2017, University of Colorado Boulder

/**
 * Scenery node for the skater, which is draggable.
 *
 * Converted to composition instead of inheritance for SkaterNode to work around updateSVGFragment problem, see #123
 *
 * @author Sam Reid
 */
define( function( require ) {
  'use strict';

  // modules
  var Circle = require( 'SCENERY/nodes/Circle' );
  var Constants = require( 'ENERGY_SKATE_PARK_BASICS/energy-skate-park-basics/Constants' );
  var energySkateParkBasics = require( 'ENERGY_SKATE_PARK_BASICS/energySkateParkBasics' );
  var Image = require( 'SCENERY/nodes/Image' );
  var inherit = require( 'PHET_CORE/inherit' );
  var LinearFunction = require( 'DOT/LinearFunction' );
  var Matrix3 = require( 'DOT/Matrix3' );
  var Node = require( 'SCENERY/nodes/Node' );
  var SimpleDragHandler = require( 'SCENERY/input/SimpleDragHandler' );

  // images
  var skaterLeftImage = require( 'image!ENERGY_SKATE_PARK_BASICS/skater-left.png' );
  var skaterRightImage = require( 'image!ENERGY_SKATE_PARK_BASICS/skater-right.png' );

  // Map from mass(kg) to the amount to scale the image
  var centerMassValue = (Constants.MIN_MASS + Constants.MAX_MASS) / 2;
  var massToScale = new LinearFunction( centerMassValue, Constants.MAX_MASS, 0.34, 0.43 );

  /**
   * SkaterNode constructor
   *
   * @param {Skater} skater
   * @param {EnergySkateParkBasicsScreenView} view
   * @param {ModelViewTransform} modelViewTransform
   * @param {function} getClosestTrackAndPositionAndParameter function that gets the closest track properties, used when
   * the skater is being dragged close to the track
   * @param {function} getPhysicalTracks function that returns the physical tracks in the model, so the skater can try
   * to attach to them while dragging
   * @param {string} renderer - root renderer for this node, see Node.setRenderer for values
   * @param {Tandem} tandem
   * @constructor
   */
  function SkaterNode( skater, view, modelViewTransform, getClosestTrackAndPositionAndParameter, getPhysicalTracks, renderer, tandem ) {
    this.skater = skater;
    var self = this;

    // Use a separate texture for left/right skaters to avoid WebGL performance issues when switching textures
    var leftSkaterImageNode = new Image( skaterLeftImage, {
      cursor: 'pointer',
      tandem: tandem.createTandem( 'leftSkaterImageNode' )
    } );
    var rightSkaterImageNode = new Image( skaterRightImage, {
      cursor: 'pointer',
      tandem: tandem.createTandem( 'rightSkaterImageNode' )
    } );

    Node.call( this, {
      children: [ leftSkaterImageNode, rightSkaterImageNode ],
      renderer: renderer,
      tandem: tandem,

      // a11y - use a focusable element to test how updating the position of the element in the PDOM impacts this sim,
      // tag not intended for long term instrumentation, see
      // https://github.com/phetsims/energy-skate-park-basics/issues/437
      tagName: 'input',
      inputType: 'button',
      labelTagName: 'label',
      labelContent: 'Grab the skater to drag'

    } );

    skater.directionProperty.link( function( direction ) {
      leftSkaterImageNode.visible = direction === 'left';
      rightSkaterImageNode.visible = direction === 'right';
    } );

    var imageWidth = this.width;
    var imageHeight = this.height;

    // Update the position and angle.  Normally the angle would only change if the position has also changed, so no need
    // for a duplicate callback there.  Uses pooling to avoid allocations, see #50
    this.skater.updatedEmitter.addListener( function() {
      var mass = skater.massProperty.value;
      var position = skater.positionProperty.value;
      var angle = skater.angleProperty.value;

      var view = modelViewTransform.modelToViewPosition( position );

      // Translate to the desired location
      var matrix = Matrix3.translation( view.x, view.y );

      // Rotate about the pivot (bottom center of the skater)
      var rotationMatrix = Matrix3.rotation2( angle );
      matrix.multiplyMatrix( rotationMatrix );
      rotationMatrix.freeToPool();

      var scale = massToScale( mass );
      var scalingMatrix = Matrix3.scaling( scale );
      matrix.multiplyMatrix( scalingMatrix );
      scalingMatrix.freeToPool();

      // Think of it as a multiplying the Vector2 to the right, so this step happens first actually.  Use it to center
      // the registration point
      var translation = Matrix3.translation( -imageWidth / 2, -imageHeight );
      matrix.multiplyMatrix( translation );
      translation.freeToPool();

      self.setMatrix( matrix );
    } );

    // Show a red dot in the bottom center as the important particle model coordinate
    var circle = new Circle( 8, { fill: 'red', x: imageWidth / 2, y: imageHeight } );
    if ( renderer === 'webgl' ) {
      circle = circle.toCanvasNodeSynchronous();
    }
    this.addChild( circle );

    var targetTrack = null;

    var targetU = null;

    function dragSkater( event ) {
      var globalPoint = self.globalToParentPoint( event.pointer.point );
      var position = modelViewTransform.viewToModelPosition( globalPoint );

      // make sure it is within the visible bounds
      position = view.availableModelBounds.getClosestPoint( position.x, position.y, position );

      // PERFORMANCE/ALLOCATION: lots of unnecessary allocations and computation here, biggest improvement could be
      // to use binary search for position on the track
      var closestTrackAndPositionAndParameter = getClosestTrackAndPositionAndParameter( position, getPhysicalTracks() );
      var closeEnough = false;
      if ( closestTrackAndPositionAndParameter && closestTrackAndPositionAndParameter.track && closestTrackAndPositionAndParameter.track.isParameterInBounds( closestTrackAndPositionAndParameter.parametricPosition ) ) {
        var closestPoint = closestTrackAndPositionAndParameter.point;
        var distance = closestPoint.distance( position );
        if ( distance < 0.5 ) {
          position = closestPoint;
          targetTrack = closestTrackAndPositionAndParameter.track;
          targetU = closestTrackAndPositionAndParameter.parametricPosition;

          // Choose the right side of the track, i.e. the side of the track that would have the skater upside up
          var normal = targetTrack.getUnitNormalVector( targetU );
          skater.onTopSideOfTrackProperty.value = normal.y > 0;

          skater.angleProperty.value = targetTrack.getViewAngleAt( targetU ) + (skater.onTopSideOfTrackProperty.value ? 0 : Math.PI);

          closeEnough = true;
        }
      }
      if ( !closeEnough ) {
        targetTrack = null;
        targetU = null;

        // make skater upright if not near the track
        skater.angleProperty.value = 0;
        skater.onTopSideOfTrackProperty.value = true;

        skater.positionProperty.value = position;
      }

      else {
        skater.positionProperty.value = targetTrack.getPoint( targetU );
      }

      skater.updateEnergy();
      skater.updatedEmitter.emit();
    }

    var dragHandler = new SimpleDragHandler( {
      tandem: tandem.createTandem( 'inputListener' ),
      start: function( event ) {
        skater.draggingProperty.value = true;

        // Clear thermal energy whenever skater is grabbed, see #32
        skater.thermalEnergyProperty.value = 0;

        // Jump to the input location when dragged
        dragSkater( event );
      },

      drag: dragSkater,

      end: function() {
        // Record the state of the skater for "return skater"
        skater.released( targetTrack, targetU );
      }
    } );
    this.addInputListener( dragHandler );

    // when the skater is reset, interrupt all dragging - no need to dispose as SkaterNodes are never destroyed
    skater.resetEmitter.addListener( function() {
      dragHandler.interrupt();
    } );
  }

  energySkateParkBasics.register( 'SkaterNode', SkaterNode );

  return inherit( Node, SkaterNode );
} );
