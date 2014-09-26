//  Copyright 2002-2014, University of Colorado Boulder

/**
 * The scenery node that shows a control point on a track, and allows the user to drag it or click on it for more
 * options.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var Circle = require( 'SCENERY/nodes/Circle' );
  var SimpleDragHandler = require( 'SCENERY/input/SimpleDragHandler' );
  var ControlPointUI = require( 'ENERGY_SKATE_PARK_BASICS/view/ControlPointUI' );

  /**
   * @param {TrackNode} trackNode
   * @param {TrackDragHandler} trackDragHandler
   * @param {number} i
   * @param {boolean} isEndPoint
   * @constructor
   */
  function ControlPointNode( trackNode, trackDragHandler, i, isEndPoint ) {
    var track = trackNode.track;
    var model = trackNode.model;
    var modelViewTransform = trackNode.modelViewTransform;
    var availableBoundsProperty = trackNode.availableBoundsProperty;

    var controlPointNode = this;
    var controlPoint = track.controlPoints[i];

    Circle.call( this, 14, {pickable: true, opacity: 0.7, stroke: 'black', lineWidth: 2, fill: 'red', cursor: 'pointer', translation: modelViewTransform.modelToViewPosition( controlPoint.position )} );

    // Show a dotted line for the exterior track points, which can be connected to other track
    if ( i === 0 || i === track.controlPoints.length - 1 ) {
      controlPointNode.lineDash = [ 4, 5 ];
    }

    controlPoint.positionProperty.link( function( position ) {
      controlPointNode.translation = modelViewTransform.modelToViewPosition( position );
    } );
    var dragEvents = 0;
    var controlPointInputListener = new SimpleDragHandler(
      {
        allowTouchSnag: true,
        start: function( event ) {

          // If control point dragged out of the control panel, translate the entire track, see #130
          if ( !track.physical || !track.dropped ) {
            trackDragHandler.trackDragStarted( event );
            return;
          }
          track.dragging = true;
          dragEvents = 0;
        },
        drag: function( event ) {

          // Check whether the model contains a track so that input listeners for detached elements can't create bugs, see #230
          if ( !model.containsTrack( track ) ) { return; }

          // If control point dragged out of the control panel, translate the entire track, see #130
          if ( !track.physical || !track.dropped ) {
            trackDragHandler.trackDragged( event );
            return;
          }
          dragEvents++;
          track.dragging = true;
          var globalPoint = controlPointNode.globalToParentPoint( event.pointer.point );

          // trigger reconstruction of the track shape based on the control points
          var pt = modelViewTransform.viewToModelPosition( globalPoint );

          // Constrain the control points to remain in y>0, see #71
          pt.y = Math.max( pt.y, 0 );

          if ( availableBoundsProperty.value ) {
            var availableBounds = availableBoundsProperty.value;

            // Constrain the control points to be onscreen, see #94
            pt.x = Math.max( pt.x, availableBounds.minX );
            pt.x = Math.min( pt.x, availableBounds.maxX );
            pt.y = Math.min( pt.y, availableBounds.maxY );
          }

          controlPoint.sourcePosition = pt;

          if ( isEndPoint ) {
            // If one of the control points is close enough to link to another track, do so
            var tracks = model.getPhysicalTracks();

            var bestDistance = Number.POSITIVE_INFINITY;
            var bestMatch = null;

            for ( var i = 0; i < tracks.length; i++ ) {
              var t = tracks[i];
              if ( t !== track ) {

                // don't match inner points
                var otherPoints = [t.controlPoints[0], t.controlPoints[t.controlPoints.length - 1]];

                for ( var k = 0; k < otherPoints.length; k++ ) {
                  var otherPoint = otherPoints[k];
                  var distance = controlPoint.sourcePosition.distance( otherPoint.position );

                  if ( distance < bestDistance ) {
                    bestDistance = distance;
                    bestMatch = otherPoint;
                  }
                }
              }
            }

            controlPoint.snapTarget = bestDistance !== null && bestDistance < 1 ? bestMatch : null;
          }

          // When one control point dragged, update the track and the node shape
          track.updateSplines();
          trackNode.updateTrackShape();
          model.trackModified( track );
        },
        end: function( event ) {

          // Check whether the model contains a track so that input listeners for detached elements can't create bugs, see #230
          if ( !model.containsTrack( track ) ) { return; }

          // If control point dragged out of the control panel, translate the entire track, see #130
          if ( !track.physical || !track.dropped ) {
            trackDragHandler.trackDragEnded( event );
            return;
          }
          if ( isEndPoint && controlPoint.snapTarget ) {
            model.joinTracks( track );
          }
          else {
            track.smoothPointOfHighestCurvature( [i] );
            model.trackModified( track );
          }
          track.bumpAboveGround();
          track.dragging = false;

          // Show the 'control point editing' ui, but only if the user didn't drag the control point.
          // Threshold at a few drag events in case the user didn't mean to drag it but accidentally moved it a few pixels.
          if ( dragEvents <= 3 ) {
            var controlPointUI = new ControlPointUI( model, track, i, modelViewTransform, trackNode.parents[0] );
            track.on( 'remove', function() { controlPointUI.detach(); } );
            trackNode.parents[0].addChild( controlPointUI );
          }

          if ( window.phetcommon.getQueryParameter( 'debugTrack' ) ) {
            console.log( track.getDebugString() );
          }
        }
      } );
    controlPointNode.addInputListener( controlPointInputListener );
  }

  return inherit( Circle, ControlPointNode );
} );