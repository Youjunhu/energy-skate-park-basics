// Copyright 2014-2017, University of Colorado Boulder

/**
 * The drag handler for moving the body of a track (not a control point).
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var energySkateParkBasics = require( 'ENERGY_SKATE_PARK_BASICS/energySkateParkBasics' );
  var EnergySkateParkBasicsQueryParameters = require( 'ENERGY_SKATE_PARK_BASICS/energy-skate-park-basics/EnergySkateParkBasicsQueryParameters' );
  var inherit = require( 'PHET_CORE/inherit' );
  var SimpleDragHandler = require( 'SCENERY/input/SimpleDragHandler' );

  /**
   * @param {TrackNode} trackNode the track node that this listener will drag
   * @param {Tandem} tandem
   * @constructor
   */
  function TrackDragHandler( trackNode, tandem ) {
    this.trackNode = trackNode;
    var self = this;
    this.track = trackNode.track;
    var track = trackNode.track;
    this.model = trackNode.model;
    this.modelViewTransform = trackNode.modelViewTransform;
    this.availableBoundsProperty = trackNode.availableBoundsProperty;
    this.startOffset = null;

    // Keep track of whether the user has started to drag the track.  Click events should not create tracks, only drag
    // events.  See #205
    // @private
    this.startedDrag = false;

    // Drag handler for dragging the track segment itself (not one of the control points)
    // Uses a similar strategy as MovableDragHandler but requires a separate implementation because its bounds are
    // determined by the shape of the track (so it cannot go below ground)
    // And so it can be dragged out of the toolbox but not back into it (so it won't be dragged below ground)
    var trackSegmentDragHandlerOptions = {
      tandem: tandem.createTandem( 'inputListener' ),
      allowTouchSnag: true,

      start: function( event ) {

        // Move the track to the front when it starts dragging, see #296
        // The track is in a layer of tracks (without other nodes) so moving it to the front will work perfectly
        trackNode.moveToFront();

        if ( track.dragSource === null ) {
          // A new press has started, but the user has not moved the track yet, so do not create it yet.  See #205
          track.dragSource = self;

          self.trackDragStarted( event );
        }
      },

      // Drag an entire track
      drag: function( event ) {
        if ( track.dragSource === self ) {
          self.trackDragged( event );
        }
      },

      // End the drag
      end: function( event ) {
        if ( track.dragSource === self ) {
          self.trackDragEnded( event );
        }
      }
    };
    SimpleDragHandler.call( this, trackSegmentDragHandlerOptions );
  }

  energySkateParkBasics.register( 'TrackDragHandler', TrackDragHandler );

  return inherit( SimpleDragHandler, TrackDragHandler, {

    // When the user drags the track out of the toolbox, if they drag the track by a control point, it still translates
    // the track.  In that case (and only that case), the following methods are called by the ControlPointNode drag
    // handler in order to translate the track.
    trackDragStarted: function( event ) {
      this.startedDrag = false;
    },
    trackDragged: function( event ) {
      var snapTargetChanged = false;
      var model = this.model;
      var track = this.track;

      // Check whether the model contains a track so that input listeners for detached elements can't create bugs, see #230
      if ( !model.containsTrack( track ) ) { return; }

      // On the first drag event, move the track out of the toolbox, see #205
      if ( !this.startedDrag ) {
        track.draggingProperty.value = true;

        var startingPosition = this.modelViewTransform.modelToViewPosition( track.position );
        this.startOffset = event.currentTarget.globalToParentPoint( event.pointer.point ).minus( startingPosition );
        this.startedDrag = true;
      }
      track.draggingProperty.value = true;

      var parentPoint = event.currentTarget.globalToParentPoint( event.pointer.point ).minus( this.startOffset );
      var location = this.modelViewTransform.viewToModelPosition( parentPoint );

      // If the user moved it out of the toolbox above y=0, then make it physically interactive
      var bottomControlPointY = track.getBottomControlPointY();
      if ( !track.physicalProperty.value && bottomControlPointY > 0 ) {
        track.physicalProperty.value = true;
      }

      // When dragging track, make sure the control points don't go below ground, see #71
      var modelDelta = location.minus( track.position );
      var translatedBottomControlPointY = bottomControlPointY + modelDelta.y;

      if ( track.physicalProperty.value && translatedBottomControlPointY < 0 ) {
        location.y += Math.abs( translatedBottomControlPointY );
      }

      if ( this.availableBoundsProperty.value ) {

        // constrain each point to lie within the available bounds
        var availableBounds = this.availableBoundsProperty.value;

        // Constrain the top
        var topControlPointY = track.getTopControlPointY();
        if ( topControlPointY + modelDelta.y > availableBounds.maxY ) {
          location.y = availableBounds.maxY - (topControlPointY - track.position.y);
        }

        // Constrain the left side
        var leftControlPointX = track.getLeftControlPointX();
        if ( leftControlPointX + modelDelta.x < availableBounds.minX ) {
          location.x = availableBounds.minX - (leftControlPointX - track.position.x);
        }

        // Constrain the right side
        var rightControlPointX = track.getRightControlPointX();
        if ( rightControlPointX + modelDelta.x > availableBounds.maxX ) {
          location.x = availableBounds.maxX - (rightControlPointX - track.position.x);
        }
      }

      track.position = location;

      // If one of the control points is close enough to link to another track, do so
      var tracks = model.getPhysicalTracks();

      var bestDistance = null;
      var myBestPoint = null;
      var otherBestPoint = null;

      var points = [ track.controlPoints[ 0 ], track.controlPoints[ track.controlPoints.length - 1 ] ];

      for ( var i = 0; i < tracks.length; i++ ) {
        var t = tracks[ i ];
        if ( t !== track ) {

          // 4 cases 00, 01, 10, 11
          var otherPoints = [ t.controlPoints[ 0 ], t.controlPoints[ t.controlPoints.length - 1 ] ];

          // don't match inner points
          for ( var j = 0; j < points.length; j++ ) {
            var point = points[ j ];
            for ( var k = 0; k < otherPoints.length; k++ ) {
              var otherPoint = otherPoints[ k ];
              var distance = point.sourcePositionProperty.value.distance( otherPoint.positionProperty.value );
              if ( (bestDistance === null && distance > 1E-6) || (distance < bestDistance ) ) {
                bestDistance = distance;
                myBestPoint = point;
                otherBestPoint = otherPoint;
              }
            }
          }
        }
      }

      if ( bestDistance !== null && bestDistance < 1 ) {
        if ( myBestPoint.snapTargetProperty.value !== otherBestPoint ) {
          snapTargetChanged = true;
        }
        myBestPoint.snapTargetProperty.value = otherBestPoint;

        // Set the opposite point to be unsnapped, you can only snap one at a time
        var source = (myBestPoint === points[ 0 ] ? points[ 1 ] : points[ 0 ]);
        if ( source.snapTargetProperty.value !== null ) {
          snapTargetChanged = true;
        }
        source.snapTargetProperty.value = null;
      }
      else {

        if ( points[ 0 ].snapTargetProperty.value !== null || points[ 1 ].snapTargetProperty.value !== null ) {
          snapTargetChanged = true;
        }
        points[ 0 ].snapTargetProperty.value = null;
        points[ 1 ].snapTargetProperty.value = null;
      }

      // It costs about 5fps to do this every frame (on iPad3), so only check if the snapTargets have changed.  See #235
      if ( snapTargetChanged ) {
        track.updateSplines();
        this.trackNode.updateTrackShape();
      }

      // Make it so the track can't be dragged underground when dragged by the track itself (not control point), see #166
      // But if the user is dragging the track out of the toolbox, then leave the motion continuous, see #178
      if ( track.physicalProperty.value ) {
        track.bumpAboveGround();
      }

      model.trackModified( track );
    },
    trackDragEnded: function( event ) {
      var track = this.track;
      var model = this.model;

      // If dropped in the play area, signify that it has been dropped--this will make it so that dragging the control points
      // reshapes the track instead of translating it
      track.droppedProperty.value = true;

      track.dragSource = null;

      // Check whether the model contains a track so that input listeners for detached elements can't create bugs, see #230
      if ( !model.containsTrack( track ) ) { return; }

      // If the user never dragged the object, then there is no track to drop in this case, see #205
      if ( this.startedDrag ) {
        var myPoints = [ track.controlPoints[ 0 ], track.controlPoints[ track.controlPoints.length - 1 ] ];
        if ( myPoints[ 0 ].snapTargetProperty.value || myPoints[ 1 ].snapTargetProperty.value ) {
          model.joinTracks( track ); // Track will be joined to compatible track, then both will be disposed, and new track created.
        }

        // if the track hasn't been disposed (see #393), bump it above ground if user has started dragging,
        // see #384 and #205
        if ( !track.isDisposed ) {
          track.bumpAboveGround();
        }

        if ( EnergySkateParkBasicsQueryParameters.debugTrack ) {
          console.log( track.getDebugString() );
        }
        this.startedDrag = false;
      }
    }
  } );
} );