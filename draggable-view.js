import React, { Component } from "react";
import {
    StyleSheet,
    TouchableHighlight,
    View,
    Animated,
    PanResponder,
    Dimensions
} from "react-native";
import PropTypes from "prop-types";

class DraggableView extends Component {
    constructor(props) {
        super(props);
        const initialUsedSpace = Math.abs(this.props.initialDrawerSize);
        const initialPosition = initialUsedSpace - Dimensions.get("window").height;
        const finalPosition = 0;
        if (!props.isInverseDirection) {
            initialPosition = Dimensions.get("window").height - initialUsedSpace;
        }

        
        console.log("initial size", initialPosition);
        
        this.state = {
            touched: false,
            position: new Animated.Value(initialPosition),
            initialPositon: initialPosition,
            finalPosition: finalPosition,
            closedPosition: initialPosition,
            openPosition: 0,
            initialUsedSpace: initialUsedSpace
        };
        this._panGesture = PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                return (
                    this.isAValidMovement(gestureState.dx, gestureState.dy) &&
                    this.state.touched
                );
            },
            onPanResponderMove: (evt, gestureState) => {
                this.moveDrawerView(gestureState);
            },
            onPanResponderRelease: (evt, gestureState) => {
                this.moveFinished(gestureState);
            }
        });
    }

    isAValidMovement = (distanceX, distanceY) => {
        const moveTravelledFarEnough =
        Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > 2;
        return moveTravelledFarEnough;
    };

    startAnimation = (
        velocityY,
        positionY,
        initialPositon,
        id,
        finalPosition
    ) => {
        const { isInverseDirection } = this.props;

        var isGoingToUp = velocityY < 0 ? !isInverseDirection : isInverseDirection;
        var endPosition = isGoingToUp ? finalPosition + 50 : initialPositon + 50;

        var position = new Animated.Value(positionY);
        position.removeAllListeners();

        Animated.timing(position, {
            toValue: endPosition,
            tension: 30,
            friction: 0,
            velocity: velocityY
        }).start();

        position.addListener(position => {
            if (!this.center) return;
            this.onUpdatePosition(position.value);
        });
    };

    onUpdatePosition(position) {
        position = position - 50;
        this.state.position.setValue(position);
        this._previousTop = position;
        const { initialPosition } = this.state;

        if (initialPosition === position) {
            this.props.onInitialPositionReached();
        }
    }

    moveDrawerView(gestureState) {
        if (!this.center) return;
        const position = gestureState.moveY - Dimensions.get("window").height * 0.05;
        this.onUpdatePosition(position);
    }

    moveFinished(gestureState) {
        const isGoingToUp = gestureState.vy < 0;
        if (!this.center) return;
        this.startAnimation(
            gestureState.vy,
            gestureState.moveY,
            this.state.closedPosition,
            gestureState.stateId,
            this.state.openPosition
        );
        this.props.onRelease(isGoingToUp);
    }

    onDrawerLayout(e) {
        let drawerHeight = e.nativeEvent.layout.height;
        let windowHeight = Dimensions.get("window").height;
        this.state.closedPosition = drawerHeight - windowHeight;
        this.state.openPosition = 0;
    }

    render() {
        const containerView = this.props.renderContainerView();
        const drawerView = this.props.renderDrawerView();
        const initDrawerView = this.props.renderInitDrawerView();

        const drawerPosition = {
            top: this.state.position
        };

        console.log(drawerPosition, Dimensions.get("window"));

        return (
            <View style={styles.viewport}>
                <View style={styles.container}>{containerView}</View>
                <Animated.View
                    style={[
                        drawerPosition,
                        styles.drawer,
                        styles.border,
                        {
                            backgroundColor: this.props.drawerBg
                        }
                    ]}
                    ref={center => (this.center = center)}
                    {...this._panGesture.panHandlers}
                >
                    <View style={styles.drawer}>
                        {drawerView}
                    </View>
                    
                    {initDrawerView
                        ? (
                            <TouchableHighlight
                                onLayout={(e) => this.onDrawerLayout(e)}
                                //style={this.state.touched? styles.red : styles.blue }
                                onPressIn={() => this.setState({ touched: true })}
                                onPressOut={() => this.setState({ touched: false })}
                            >
                                {initDrawerView}
                            </TouchableHighlight>
                        )
                        : null
                    }
                </Animated.View>
            </View>
        );
    }
}

var styles = StyleSheet.create({
    viewport: {
        flex: 1
    },
    drawer: {
        flex: 1
    },
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
    },
    red: {
      color: 'red',
    },
    blue: {
      color: 'blue',
    },
    border: {
      borderColor: 'blue',
      borderWidth: 2,
    },
});

DraggableView.propTypes = {
    drawerBg: PropTypes.string,
    finalDrawerHeight: PropTypes.number,
    isInverseDirection: PropTypes.bool,
    onInitialPositionReached: PropTypes.func,
    onRelease: PropTypes.func,
    renderContainerView: PropTypes.func,
    renderDrawerView: PropTypes.func,
    renderInitDrawerView: PropTypes.func
};

DraggableView.defaultProps = {
    drawerBg: "white",
    finalDrawerHeight: 0,
    isInverseDirection: false,
    onInitialPositionReached: () => {},
    onRelease: () => {},
    renderContainerView: () => {},
    renderDrawerView: () => {},
    renderInitDrawerView: () => {}
};

export default DraggableView;
