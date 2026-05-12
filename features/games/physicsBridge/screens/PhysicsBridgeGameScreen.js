import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { savePhysicsBridgeLevelResult } from '../utils/bridgeProgressStorage.js';

const TOOL = {
  ROAD: 'road',
  WOOD: 'wood',
  CABLE: 'cable',
};

const GRID_SIZE = 34;
const ROAD_LENGTH = GRID_SIZE * 2;
const SUPPORT_LENGTH = GRID_SIZE * 2;
const CABLE_MAX_LENGTH = GRID_SIZE * 5;
const NODE_SNAP_DISTANCE = 18;
const TARGET_SNAP_DISTANCE = 22;

const ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

const COLORS = {
  background: '#F6F8FF',
  primary: '#1E4FBF',
  dark: '#102A68',
  secondary: '#546A99',
  border: '#E5ECFF',
  road: '#243B63',
  wood: '#F59E0B',
  cable: '#FACC15',
  success: '#2ECC71',
  danger: '#E74C3C',
  water: '#BFE7FF',
  sky: '#EAF3FF',
  ground: '#8E6B4D',
  grass: '#4FB86B',
};

const MATERIAL_COST = {
  road: 26,
  wood: 14,
  cable: 18,
};

const TOOL_LABELS = {
  road: 'طريق',
  wood: 'دعم',
  cable: 'سلك',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundPoint(point) {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
  };
}

function levelNumberFromId(levelId) {
  const match = String(levelId || '').match(/(\d+)$/);
  return match ? Number(match[1]) : 1;
}

export default function PhysicsBridgeGameScreen({
  navigation,
  route,
  navigateTo,
  studentId = 'anonymous-player',
}) {
  const routeLevelId = route?.params?.levelId;
  const initialLevel = clamp(levelNumberFromId(routeLevelId), 1, 3);

  const [levelNumber, setLevelNumber] = useState(initialLevel);
  const [nodes, setNodes] = useState([]);
  const [segments, setSegments] = useState([]);
  const [selectedTool, setSelectedTool] = useState(TOOL.ROAD);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [message, setMessage] = useState('اختر أداة ثم اسحب بين نقطتين لبناء قطعة.');
  const [attempts, setAttempts] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [failedSegmentId, setFailedSegmentId] = useState(null);
  const [introVisible, setIntroVisible] = useState(true);
  const [helpVisible, setHelpVisible] = useState(false);
  const [resultModal, setResultModal] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(0);

  const carProgress = useRef(new Animated.Value(0)).current;
  const carDrop = useRef(new Animated.Value(0)).current;
  const bridgeShake = useRef(new Animated.Value(0)).current;
  const startedAtRef = useRef(Date.now());
  const lastValidationRef = useRef(null);
  const attemptCountRef = useRef(0);

  const level = useMemo(() => getLevelConfig(levelNumber), [levelNumber]);
  const budgetUsed = useMemo(() => segments.reduce((sum, segment) => sum + segment.cost, 0), [segments]);
  const materialCounts = useMemo(() => ({
    road: segments.filter((segment) => segment.type === TOOL.ROAD).length,
    wood: segments.filter((segment) => segment.type === TOOL.WOOD).length,
    cable: segments.filter((segment) => segment.type === TOOL.CABLE).length,
  }), [segments]);
  const remainingMaterials = useMemo(() => ({
    road: level.materials.road - materialCounts.road,
    wood: level.materials.wood - materialCounts.wood,
    cable: level.materials.cable - materialCounts.cable,
  }), [level, materialCounts]);

  useEffect(() => {
    initializeLevel(levelNumber);
  }, [levelNumber]);

  useEffect(() => {
    if (introVisible || resultModal || isRunning) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          failSimulation('انتهى الوقت.', null);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [introVisible, resultModal, isRunning, levelNumber, segments]);

  const availableTargets = useMemo(() => {
    const fromNode = getNodeById(selectedNodeId);
    return fromNode ? getAvailableSnapTargets(fromNode, selectedTool) : [];
  }, [selectedNodeId, selectedTool, nodes, segments, boardSize, remainingMaterials]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isRunning && !introVisible && !resultModal,
    onMoveShouldSetPanResponder: () => !isRunning && !introVisible && !resultModal,
    onPanResponderGrant: (event) => {
      const point = getBoardTouchPoint(event);
      const node = findNearbyNode(point);
      if (!node) {
        setMessage('ابدأ من نقطة ربط ظاهرة على الجسر.');
        return;
      }

      if (!isNodeUsableForTool(node, selectedTool)) {
        setMessage('هذه النقطة غير مناسبة للأداة المختارة.');
        return;
      }

      setSelectedNodeId(node.id);
      setSelectedSegmentId(null);
      setPreview(null);
      setMessage('اسحب إلى الهدف المضيء لبناء القطعة.');
    },
    onPanResponderMove: (event) => {
      const fromNode = getNodeById(selectedNodeId);
      if (!fromNode) {
        return;
      }

      const point = getBoardTouchPoint(event);
      const target = findNearestSnapTarget(point, getAvailableSnapTargets(fromNode, selectedTool));

      if (!target) {
        setPreview({
          from: fromNode,
          to: point,
          valid: false,
          reason: 'استخدم قطعة بطولها القياسي.',
          type: selectedTool,
        });
        return;
      }

      const check = canBuildSegment(fromNode, target.node || target.point, selectedTool);
      setPreview({
        from: fromNode,
        to: target.node || target.point,
        target,
        valid: check.ok,
        reason: check.reason,
        type: selectedTool,
      });
    },
    onPanResponderRelease: () => {
      if (!preview?.target || !selectedNodeId) {
        setPreview(null);
        return;
      }

      if (!preview.valid) {
        setMessage(preview.reason || 'هذه القطعة غير صالحة.');
        setPreview(null);
        return;
      }

      addSegment(selectedNodeId, preview.target, selectedTool);
      setPreview(null);
    },
  }), [isRunning, introVisible, resultModal, selectedNodeId, selectedTool, preview, nodes, segments, boardSize]);

  function getLevelConfig(number) {
    const configs = {
      1: {
        id: 'physics_bridge_level_1',
        number: 1,
        title: 'المستوى 1',
        goal: 'ابنِ طريقاً إلى العلم، ثم أضف مثلث دعم.',
        budgetLimit: 200,
        timeLimit: 120,
        materials: { road: 4, wood: 6, cable: 0 },
        minTriangles: 1,
        stabilityThreshold: 45,
        maxRoadSlope: 34,
        finishTolerance: 30,
        ground: { leftWidth: 86, rightWidth: 86, y: 0.66 },
        anchors: [
          { id: 'A', x: 0.22, y: 0.53, label: 'A', type: 'anchor', fixed: true, roadAnchor: true, supportAnchor: true },
          { id: 'D', x: 0.78, y: 0.53, label: 'D', type: 'anchor', fixed: true, roadAnchor: true, supportAnchor: true },
          { id: 'B', x: 0.50, y: 0.75, label: 'B', type: 'anchor', fixed: true, supportAnchor: true },
        ],
      },
      2: {
        id: 'physics_bridge_level_2',
        number: 2,
        title: 'المستوى 2',
        goal: 'الجسر أطول. استخدم مثلثات متكررة.',
        budgetLimit: 250,
        timeLimit: 135,
        materials: { road: 5, wood: 8, cable: 0 },
        minTriangles: 2,
        stabilityThreshold: 55,
        maxRoadSlope: 32,
        finishTolerance: 30,
        ground: { leftWidth: 74, rightWidth: 74, y: 0.65 },
        anchors: [
          { id: 'A', x: 0.18, y: 0.52, label: 'A', type: 'anchor', fixed: true, roadAnchor: true, supportAnchor: true },
          { id: 'D', x: 0.82, y: 0.52, label: 'D', type: 'anchor', fixed: true, roadAnchor: true, supportAnchor: true },
          { id: 'B', x: 0.38, y: 0.77, label: 'B', type: 'anchor', fixed: true, supportAnchor: true },
          { id: 'C', x: 0.62, y: 0.77, label: 'C', type: 'anchor', fixed: true, supportAnchor: true },
        ],
      },
      3: {
        id: 'physics_bridge_level_3',
        number: 3,
        title: 'المستوى 3',
        goal: 'استخدم الدعم والسلك بحكمة لتوفير الميزانية.',
        budgetLimit: 280,
        timeLimit: 150,
        materials: { road: 6, wood: 8, cable: 3 },
        minTriangles: 2,
        stabilityThreshold: 65,
        maxRoadSlope: 38,
        finishTolerance: 32,
        ground: { leftWidth: 72, rightWidth: 80, y: 0.66 },
        anchors: [
          { id: 'A', x: 0.18, y: 0.57, label: 'A', type: 'anchor', fixed: true, roadAnchor: true, supportAnchor: true },
          { id: 'D', x: 0.82, y: 0.46, label: 'D', type: 'anchor', fixed: true, roadAnchor: true, supportAnchor: true },
          { id: 'B', x: 0.34, y: 0.78, label: 'B', type: 'anchor', fixed: true, supportAnchor: true },
          { id: 'C', x: 0.58, y: 0.77, label: 'C', type: 'anchor', fixed: true, supportAnchor: true },
          { id: 'L', x: 0.27, y: 0.31, label: 'L', type: 'rock', fixed: true, cableAnchor: true, supportAnchor: true },
          { id: 'R', x: 0.73, y: 0.29, label: 'R', type: 'rock', fixed: true, cableAnchor: true, supportAnchor: true },
        ],
      },
    };

    return configs[number] || configs[1];
  }

  function initializeLevel(number) {
    const config = getLevelConfig(number);
    const initialNodes = config.anchors.map((anchor) => ({
      ...anchor,
      x: 0,
      y: 0,
      ratioX: anchor.x,
      ratioY: anchor.y,
    }));

    setNodes(initialNodes);
    setSegments([]);
    setSelectedNodeId(null);
    setSelectedSegmentId(null);
    setPreview(null);
    setAttempts(0);
    setSecondsLeft(config.timeLimit);
    setFailedSegmentId(null);
    setIsRunning(false);
    setResultModal(null);
    setTutorialStep(number === 1 ? 1 : 0);
    setMessage(number === 1 ? 'اختر الطريق أولاً. السيارة تمشي على الطريق فقط.' : config.goal);
    attemptCountRef.current = 0;
    carProgress.setValue(0);
    carDrop.setValue(0);
    bridgeShake.setValue(0);
    startedAtRef.current = Date.now();
  }

  function showIntroIfNeeded() {
    setIntroVisible(true);
  }

  function startTutorial() {
    setIntroVisible(false);
    setTutorialStep(levelNumber === 1 ? 1 : 0);
    setMessage(levelNumber === 1 ? 'اختر الطريق أولاً. السيارة تمشي على الطريق فقط.' : level.goal);
  }

  function advanceTutorialStep(eventName) {
    if (levelNumber !== 1 || tutorialStep === 0) {
      return;
    }

    const roadCount = materialCounts.road;
    const woodCount = materialCounts.wood;
    const validation = validateBridge({ silent: true });

    if (tutorialStep === 1 && eventName === 'tool-road') {
      setTutorialStep(2);
      setMessage('اسحب من A إلى النقطة التالية لبناء أول قطعة طريق.');
    } else if (tutorialStep === 2 && roadCount >= 1) {
      setTutorialStep(3);
      setMessage('أحسنت. كل نهاية قطعة تصبح نقطة ربط جديدة.');
    } else if (tutorialStep === 3 && validation.roadPath?.length > 0) {
      setTutorialStep(4);
      setMessage('الطريق وحده ضعيف. اختر الدعم وابنِ مثلثاً تحت الطريق.');
    } else if (tutorialStep === 4 && eventName === 'tool-wood') {
      setTutorialStep(5);
      setMessage('ابنِ مثلثاً تحت الطريق ليصبح الجسر أقوى.');
    } else if (tutorialStep === 5 && woodCount >= 2) {
      setTutorialStep(6);
      setMessage('اضغط تشغيل لاختبار الجسر.');
    }
  }

  function getNodeById(id) {
    return nodes.find((node) => node.id === id) || null;
  }

  function getSegmentById(id) {
    return segments.find((segment) => segment.id === id) || null;
  }

  function getDistance(a, b) {
    if (!a || !b) {
      return 0;
    }
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function getAngle(a, b) {
    if (!a || !b) {
      return 0;
    }
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  }

  function getBoardTouchPoint(event) {
    return {
      x: clamp(event.nativeEvent.locationX, 0, boardSize.width),
      y: clamp(event.nativeEvent.locationY, 0, boardSize.height),
    };
  }

  function scaleNodesToBoard(width, height) {
    if (!width || !height) {
      return;
    }

    setNodes((currentNodes) => currentNodes.map((node) => {
      if (!node.ratioX && !node.ratioY) {
        return node;
      }
      return {
        ...node,
        x: Math.round(node.ratioX * width),
        y: Math.round(node.ratioY * height),
      };
    }));
  }

  function isInsideBuildArea(point) {
    if (!point || !boardSize.width || !boardSize.height) {
      return false;
    }

    return point.x >= 22
      && point.x <= boardSize.width - 22
      && point.y >= 58
      && point.y <= boardSize.height - 36;
  }

  function findNearbyNode(point) {
    if (!point) {
      return null;
    }

    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    nodes.forEach((node) => {
      const distance = getDistance(point, node);
      if (distance < nearestDistance && distance <= NODE_SNAP_DISTANCE) {
        nearest = node;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  function createDynamicNode(point, segmentId, toolType) {
    const rounded = roundPoint(point);
    const id = `N${Date.now()}_${Math.round(Math.random() * 1000)}`;
    return {
      id,
      label: '',
      x: rounded.x,
      y: rounded.y,
      type: 'dynamic',
      fixed: false,
      createdBySegmentId: segmentId,
      roadAnchor: toolType === TOOL.ROAD,
      supportAnchor: true,
      cableAnchor: true,
    };
  }

  function getAvailableSnapTargets(fromNode, toolType) {
    if (!fromNode || remainingMaterials[toolType] <= 0) {
      return [];
    }

    if (!isNodeUsableForTool(fromNode, toolType)) {
      return [];
    }

    const length = toolType === TOOL.CABLE ? CABLE_MAX_LENGTH : toolType === TOOL.ROAD ? ROAD_LENGTH : SUPPORT_LENGTH;
    const targets = [];

    ANGLES.forEach((angle) => {
      if (toolType === TOOL.ROAD && !isRoadAngleAllowed(angle)) {
        return;
      }

      if (toolType === TOOL.CABLE && !level.materials.cable) {
        return;
      }

      const radians = angle * Math.PI / 180;
      const point = {
        x: fromNode.x + Math.cos(radians) * length,
        y: fromNode.y + Math.sin(radians) * length,
      };

      if (!isInsideBuildArea(point)) {
        return;
      }

      const nearbyNode = findNodeNearPoint(point);
      const targetNode = nearbyNode && nearbyNode.id !== fromNode.id ? nearbyNode : null;
      const targetPoint = targetNode || roundPoint(point);
      const check = canBuildSegment(fromNode, targetPoint, toolType, { allowMissingTargetNode: true });

      targets.push({
        id: targetNode ? targetNode.id : `${Math.round(point.x)}:${Math.round(point.y)}`,
        x: targetNode ? targetNode.x : Math.round(point.x),
        y: targetNode ? targetNode.y : Math.round(point.y),
        node: targetNode,
        point: targetNode ? null : roundPoint(point),
        valid: check.ok,
        reason: check.reason,
      });
    });

    return targets.filter((target, index, list) => (
      list.findIndex((other) => Math.abs(other.x - target.x) < 4 && Math.abs(other.y - target.y) < 4) === index
    ));
  }

  function findNodeNearPoint(point) {
    return nodes.find((node) => getDistance(node, point) <= TARGET_SNAP_DISTANCE) || null;
  }

  function findNearestSnapTarget(point, targets) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    targets.forEach((target) => {
      const distance = getDistance(point, target);
      if (distance < nearestDistance && distance <= TARGET_SNAP_DISTANCE + 16) {
        nearest = target;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  function isRoadAngleAllowed(angle) {
    const normalized = Math.abs(((angle % 360) + 360) % 360);
    return normalized <= level.maxRoadSlope
      || normalized >= 360 - level.maxRoadSlope
      || Math.abs(normalized - 180) <= level.maxRoadSlope;
  }

  function isNodeUsableForTool(node, toolType) {
    if (!node) {
      return false;
    }

    if (toolType === TOOL.ROAD) {
      return Boolean(node.roadAnchor || node.type === 'dynamic' || node.fixed);
    }

    if (toolType === TOOL.CABLE) {
      return level.materials.cable > 0 && Boolean(node.cableAnchor || node.type === 'dynamic' || node.fixed);
    }

    return Boolean(node.supportAnchor || node.type === 'dynamic' || node.fixed);
  }

  function canBuildSegment(fromNode, toPointOrNode, toolType, options = {}) {
    if (!fromNode || !toPointOrNode) {
      return { ok: false, reason: 'اختر نقطتين لبناء قطعة.' };
    }

    if (isRunning) {
      return { ok: false, reason: 'انتظر حتى ينتهي الاختبار.' };
    }

    if (remainingMaterials[toolType] <= 0) {
      return { ok: false, reason: 'لا توجد مواد كافية.' };
    }

    const toNode = toPointOrNode.id ? toPointOrNode : findNodeNearPoint(toPointOrNode);
    const targetPoint = toNode || toPointOrNode;

    if (toNode?.id === fromNode.id || getDistance(fromNode, targetPoint) < 10) {
      return { ok: false, reason: 'اختر نقطة مختلفة.' };
    }

    if (!isInsideBuildArea(targetPoint)) {
      return { ok: false, reason: 'لا تبنِ خارج منطقة اللعب.' };
    }

    if (toNode && segmentExists(fromNode.id, toNode.id)) {
      return { ok: false, reason: 'هذه القطعة موجودة بالفعل.' };
    }

    const lengthCheck = validateSegmentLength(fromNode, targetPoint, toolType, options);
    if (!lengthCheck.ok) {
      return lengthCheck;
    }

    if (toolType === TOOL.ROAD) {
      const angle = getAngle(fromNode, targetPoint);
      if (!isRoadAngleAllowed(angle)) {
        return { ok: false, reason: 'الطريق مائل أكثر من اللازم.' };
      }
    }

    if (toolType === TOOL.CABLE && level.materials.cable <= 0) {
      return { ok: false, reason: 'السلك غير متاح في هذا المستوى.' };
    }

    if (!options.allowMissingTargetNode && !toNode && toolType === TOOL.CABLE) {
      return { ok: false, reason: 'السلك يحتاج نقطة ربط واضحة.' };
    }

    return { ok: true, reason: 'قطعة صالحة.' };
  }

  function validateSegmentLength(fromNode, toNode, toolType) {
    const distance = getDistance(fromNode, toNode);
    if (toolType === TOOL.CABLE) {
      return distance <= CABLE_MAX_LENGTH && distance >= GRID_SIZE
        ? { ok: true }
        : { ok: false, reason: 'السلك أطول من الحد المسموح.' };
    }

    const expectedLength = toolType === TOOL.ROAD ? ROAD_LENGTH : SUPPORT_LENGTH;
    const tolerance = 14;
    return Math.abs(distance - expectedLength) <= tolerance
      ? { ok: true }
      : { ok: false, reason: 'استخدم قطعة بطولها القياسي.' };
  }

  function segmentExists(fromNodeId, toNodeId) {
    return segments.some((segment) => (
      (segment.fromNodeId === fromNodeId && segment.toNodeId === toNodeId)
      || (segment.fromNodeId === toNodeId && segment.toNodeId === fromNodeId)
    ));
  }

  function addSegment(fromNodeId, target, toolType) {
    const fromNode = getNodeById(fromNodeId);
    const targetNode = target.node || (target.id ? target : findNodeNearPoint(target.point || target));
    const targetPoint = targetNode || target.point || target;
    const check = canBuildSegment(fromNode, targetNode || targetPoint, toolType);

    if (!check.ok) {
      setMessage(check.reason);
      return;
    }

    const segmentId = `S${Date.now()}_${Math.round(Math.random() * 1000)}`;
    const newNode = targetNode || createDynamicNode(targetPoint, segmentId, toolType);
    const segment = {
      id: segmentId,
      fromNodeId,
      toNodeId: newNode.id,
      type: toolType,
      length: Math.round(getDistance(fromNode, newNode)),
      cost: MATERIAL_COST[toolType],
      stabilityImpact: toolType === TOOL.ROAD ? 0 : toolType === TOOL.WOOD ? 18 : 12,
    };

    setNodes((currentNodes) => (targetNode ? currentNodes : [...currentNodes, newNode]));
    setSegments((currentSegments) => [...currentSegments, segment]);
    setSelectedNodeId(newNode.id);
    setSelectedSegmentId(null);
    setFailedSegmentId(null);

    const toolName = TOOL_LABELS[toolType];
    setMessage(`تم بناء ${toolName}. اسحب من النقطة الجديدة أو اختر نقطة أخرى.`);

    setTimeout(() => {
      advanceTutorialStep(toolType === TOOL.ROAD ? 'road-built' : 'wood-built');
    }, 0);
  }

  function deleteSegment(segmentId) {
    const segment = getSegmentById(segmentId);
    if (!segment || isRunning) {
      return;
    }

    const dynamicNodeIds = nodes
      .filter((node) => node.createdBySegmentId === segment.id)
      .map((node) => node.id);

    const relatedDynamicNodeIds = new Set(dynamicNodeIds);
    let changed = true;

    while (changed) {
      changed = false;
      segments.forEach((candidate) => {
        if (candidate.id === segment.id) {
          return;
        }
        if (relatedDynamicNodeIds.has(candidate.fromNodeId) || relatedDynamicNodeIds.has(candidate.toNodeId)) {
          const createdNodes = nodes.filter((node) => node.createdBySegmentId === candidate.id);
          createdNodes.forEach((node) => {
            if (!relatedDynamicNodeIds.has(node.id)) {
              relatedDynamicNodeIds.add(node.id);
              changed = true;
            }
          });
        }
      });
    }

    setSegments((currentSegments) => currentSegments.filter((candidate) => (
      candidate.id !== segment.id
      && !relatedDynamicNodeIds.has(candidate.fromNodeId)
      && !relatedDynamicNodeIds.has(candidate.toNodeId)
    )));
    setNodes((currentNodes) => currentNodes.filter((node) => !relatedDynamicNodeIds.has(node.id)));
    setSelectedSegmentId(null);
    setSelectedNodeId(null);
    setMessage('تم حذف القطعة وما يعتمد عليها.');
  }

  function deleteLastSegment() {
    if (!segments.length || isRunning) {
      setMessage('لا توجد قطعة لحذفها.');
      return;
    }

    deleteSegment(selectedSegmentId || segments[segments.length - 1].id);
  }

  function findConnectedRoadPath() {
    const startNodeId = 'A';
    const finishNodeId = 'D';
    const roadSegments = segments.filter((segment) => segment.type === TOOL.ROAD);
    const queue = [{ nodeId: startNodeId, path: [] }];
    const visited = new Set([startNodeId]);

    while (queue.length) {
      const current = queue.shift();
      if (current.nodeId === finishNodeId) {
        return current.path;
      }

      roadSegments.forEach((segment) => {
        let nextNodeId = null;
        if (segment.fromNodeId === current.nodeId) {
          nextNodeId = segment.toNodeId;
        } else if (segment.toNodeId === current.nodeId) {
          nextNodeId = segment.fromNodeId;
        }

        if (nextNodeId && !visited.has(nextNodeId)) {
          visited.add(nextNodeId);
          queue.push({ nodeId: nextNodeId, path: [...current.path, segment.id] });
        }
      });
    }

    return [];
  }

  function detectTriangles() {
    const usedNodeIds = [...new Set(segments.flatMap((segment) => [segment.fromNodeId, segment.toNodeId]))];
    const triangles = [];

    for (let a = 0; a < usedNodeIds.length; a += 1) {
      for (let b = a + 1; b < usedNodeIds.length; b += 1) {
        for (let c = b + 1; c < usedNodeIds.length; c += 1) {
          const pairIds = [
            findSegmentBetween(usedNodeIds[a], usedNodeIds[b]),
            findSegmentBetween(usedNodeIds[b], usedNodeIds[c]),
            findSegmentBetween(usedNodeIds[c], usedNodeIds[a]),
          ].filter(Boolean);

          if (pairIds.length !== 3) {
            continue;
          }

          const triangleSegments = pairIds.map((id) => getSegmentById(id));
          const hasRoad = triangleSegments.some((segment) => segment.type === TOOL.ROAD);
          const supportCount = triangleSegments.filter((segment) => segment.type !== TOOL.ROAD).length;

          if (hasRoad && supportCount >= 2) {
            triangles.push({
              nodeIds: [usedNodeIds[a], usedNodeIds[b], usedNodeIds[c]],
              segmentIds: pairIds,
            });
          }
        }
      }
    }

    return triangles;
  }

  function findSegmentBetween(nodeAId, nodeBId) {
    return segments.find((segment) => (
      (segment.fromNodeId === nodeAId && segment.toNodeId === nodeBId)
      || (segment.fromNodeId === nodeBId && segment.toNodeId === nodeAId)
    ))?.id || null;
  }

  function calculateSegmentStability(segmentId) {
    const segment = getSegmentById(segmentId);
    if (!segment || segment.type !== TOOL.ROAD) {
      return 0;
    }

    const fromNode = getNodeById(segment.fromNodeId);
    const toNode = getNodeById(segment.toNodeId);
    const triangles = detectTriangles();
    const touchesSupport = segments.some((candidate) => (
      candidate.type !== TOOL.ROAD
      && (
        candidate.fromNodeId === segment.fromNodeId
        || candidate.toNodeId === segment.fromNodeId
        || candidate.fromNodeId === segment.toNodeId
        || candidate.toNodeId === segment.toNodeId
      )
    ));
    const touchesCable = segments.some((candidate) => (
      candidate.type === TOOL.CABLE
      && (
        candidate.fromNodeId === segment.fromNodeId
        || candidate.toNodeId === segment.fromNodeId
        || candidate.fromNodeId === segment.toNodeId
        || candidate.toNodeId === segment.toNodeId
      )
    ));
    const hasTriangle = triangles.some((triangle) => triangle.segmentIds.includes(segmentId));
    const hasSupportBelow = segments.some((candidate) => {
      if (candidate.type === TOOL.ROAD) {
        return false;
      }

      const candidateFrom = getNodeById(candidate.fromNodeId);
      const candidateTo = getNodeById(candidate.toNodeId);
      if (!candidateFrom || !candidateTo) {
        return false;
      }

      const midpoint = {
        x: (fromNode.x + toNode.x) / 2,
        y: (fromNode.y + toNode.y) / 2,
      };

      const lowerPoint = candidateFrom.y > candidateTo.y ? candidateFrom : candidateTo;
      return Math.abs(lowerPoint.x - midpoint.x) < ROAD_LENGTH && lowerPoint.y > midpoint.y + 18;
    });

    let score = 30;

    if (fromNode?.fixed || toNode?.fixed) score += 25;
    if (touchesSupport) score += 20;
    if (hasTriangle) score += 30;
    if (hasSupportBelow) score += 20;
    if (touchesCable && levelNumber === 3) score += 15;
    if (segment.length > ROAD_LENGTH + 12) score -= 25;
    if (Math.abs(getAngle(fromNode, toNode)) > level.maxRoadSlope && Math.abs(Math.abs(getAngle(fromNode, toNode)) - 180) > level.maxRoadSlope) score -= 20;
    if (!touchesSupport) score -= 15;

    return clamp(Math.round(score), 0, 100);
  }

  function calculateBridgeStability(pathIds = findConnectedRoadPath()) {
    const roadPath = pathIds.length ? pathIds : segments.filter((segment) => segment.type === TOOL.ROAD).map((segment) => segment.id);
    if (!roadPath.length) {
      return { average: 0, weakSegments: [] };
    }

    const values = roadPath.map((segmentId) => ({
      segmentId,
      stability: calculateSegmentStability(segmentId),
    }));
    const average = Math.round(values.reduce((sum, item) => sum + item.stability, 0) / values.length);
    const weakSegments = values
      .filter((item) => item.stability < level.stabilityThreshold)
      .map((item) => item.segmentId);

    return { average, weakSegments };
  }

  function validateBridge(options = {}) {
    const roadPath = findConnectedRoadPath();

    if (!roadPath.length) {
      return buildValidation(false, 'أكمل الطريق إلى العلم أولاً.', roadPath, [], 0, options);
    }

    if (budgetUsed > level.budgetLimit) {
      return buildValidation(false, 'تجاوزت الميزانية.', roadPath, [], 0, options);
    }

    const tooSteep = roadPath.find((segmentId) => {
      const segment = getSegmentById(segmentId);
      const fromNode = getNodeById(segment.fromNodeId);
      const toNode = getNodeById(segment.toNodeId);
      const angle = Math.abs(getAngle(fromNode, toNode));
      return angle > level.maxRoadSlope && Math.abs(angle - 180) > level.maxRoadSlope;
    });

    if (tooSteep) {
      return buildValidation(false, 'الطريق مائل أكثر من اللازم.', roadPath, [tooSteep], 0, options);
    }

    const pathSet = new Set(roadPath);
    const floatingRoad = segments.find((segment) => segment.type === TOOL.ROAD && !pathSet.has(segment.id));
    if (floatingRoad) {
      return buildValidation(false, 'بعض القطع غير متصلة بالجسر.', roadPath, [floatingRoad.id], 0, options);
    }

    const triangles = detectTriangles();
    if (triangles.length < level.minTriangles) {
      const stability = calculateBridgeStability(roadPath);
      return buildValidation(false, 'أضف دعماً مثلثياً لتقوية الجسر.', roadPath, stability.weakSegments, stability.average, options);
    }

    const stability = calculateBridgeStability(roadPath);
    if (stability.weakSegments.length) {
      return buildValidation(false, 'الجسر ضعيف. أضف دعماً مثلثياً.', roadPath, stability.weakSegments, stability.average, options);
    }

    return buildValidation(true, 'الجسر جاهز للاختبار.', roadPath, [], stability.average, options);
  }

  function buildValidation(ok, reason, roadPath, weakSegments, stabilityScore, options) {
    const result = {
      ok,
      reason,
      roadPath,
      weakSegments,
      stabilityScore,
      trianglesCount: detectTriangles().length,
    };

    if (!options.silent) {
      lastValidationRef.current = result;
    }

    return result;
  }

  function startSimulation() {
    if (isRunning) {
      return;
    }

    const nextAttempts = attempts + 1;
    attemptCountRef.current = nextAttempts;
    setAttempts(nextAttempts);
    setIsRunning(true);
    setSelectedNodeId(null);
    setSelectedSegmentId(null);
    setPreview(null);
    setFailedSegmentId(null);
    carDrop.setValue(0);
    carProgress.setValue(0);

    const validation = validateBridge();
    lastValidationRef.current = validation;

    if (!validation.ok) {
      failSimulation(validation.reason, validation.weakSegments?.[0] || null);
      return;
    }

    setMessage('السيارة تختبر الجسر...');
    animateCarAlongPath(validation.roadPath);
  }

  function animateCarAlongPath(path) {
    Animated.timing(carProgress, {
      toValue: 1,
      duration: Math.max(2200, path.length * 850),
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }
      completeLevel();
    });
  }

  function failSimulation(reason, weakSegmentId) {
    setFailedSegmentId(weakSegmentId);
    setMessage(reason);
    bridgeShake.setValue(0);
    carDrop.setValue(0);

    Animated.sequence([
      Animated.timing(bridgeShake, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(bridgeShake, { toValue: -1, duration: 70, useNativeDriver: true }),
      Animated.timing(bridgeShake, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(bridgeShake, { toValue: 0, duration: 70, useNativeDriver: true }),
      Animated.timing(carDrop, { toValue: 1, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      const validation = lastValidationRef.current || validateBridge({ silent: true });
      const result = buildResultPayload(false, reason, validation);
      saveGameResult(result);
      setIsRunning(false);
      setResultModal({
        type: 'fail',
        title: 'الجسر فشل',
        reason,
        tip: getFailureTip(reason),
        result,
      });
    });
  }

  function completeLevel() {
    const validation = lastValidationRef.current || validateBridge({ silent: true });
    const result = buildResultPayload(true, null, validation);
    saveGameResult(result);
    setIsRunning(false);
    setTutorialStep(levelNumber === 1 ? 7 : tutorialStep);
    setMessage(levelNumber === 1 ? 'أحسنت! الآن فهمت طريقة البناء.' : 'أحسنت! عبرت السيارة بنجاح.');
    setResultModal({
      type: 'success',
      title: levelNumber === 1 ? 'أحسنت! الآن فهمت طريقة البناء' : 'أحسنت! الجسر نجح',
      result,
    });
  }

  function calculateScore(validation = validateBridge({ silent: true })) {
    const budgetEfficiency = clamp(1 - budgetUsed / level.budgetLimit, 0, 1);
    const budgetScore = Math.round(budgetEfficiency * 20);
    const stabilityScore = Math.round((validation.stabilityScore || 0) / 100 * 20);
    const attemptScore = attempts <= 0 ? 15 : attempts === 1 ? 15 : attempts === 2 ? 10 : 5;
    const timeScore = Math.round((secondsLeft / level.timeLimit) * 10);

    return clamp(35 + budgetScore + stabilityScore + attemptScore + timeScore, 0, 100);
  }

  function calculatePlanningScore() {
    const materialEfficiency = 1 - (
      (materialCounts.road + materialCounts.wood + materialCounts.cable)
      / (level.materials.road + level.materials.wood + Math.max(level.materials.cable, 1))
    );
    const budgetEfficiency = 1 - budgetUsed / level.budgetLimit;
    const attemptFactor = attempts <= 1 ? 1 : attempts === 2 ? 0.72 : 0.48;
    return clamp(Math.round((materialEfficiency * 35 + budgetEfficiency * 45 + attemptFactor * 20)), 0, 100);
  }

  function calculateEngineeringAbilityScore(validation = validateBridge({ silent: true })) {
    const triangleBonus = clamp(validation.trianglesCount * 10, 0, 25);
    const pathBonus = validation.roadPath?.length ? 20 : 0;
    return clamp(Math.round((validation.stabilityScore || 0) * 0.55 + triangleBonus + pathBonus), 0, 100);
  }

  function calculateProblemSolvingScore(completed) {
    if (!completed) {
      return clamp(30 + Math.min(attempts, 3) * 8, 0, 60);
    }

    if (attempts <= 1) return 82;
    if (attempts === 2) return 92;
    return 74;
  }

  function buildResultPayload(completed, failedReason, validation) {
    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const score = completed ? calculateScore(validation) : 0;

    return {
      gameType: 'bridge_builder',
      level: levelNumber,
      levelId: level.id,
      completed,
      score,
      stars: completed ? (score >= 85 ? 3 : score >= 65 ? 2 : 1) : 0,
      budgetUsed,
      budgetLimit: level.budgetLimit,
      roadCount: materialCounts.road,
      supportCount: materialCounts.wood,
      cableCount: materialCounts.cable,
      attempts: Math.max(1, attemptCountRef.current || attempts),
      timeSpentSeconds,
      stabilityScore: validation.stabilityScore || 0,
      planningScore: calculatePlanningScore(),
      engineeringAbilityScore: calculateEngineeringAbilityScore(validation),
      problemSolvingScore: calculateProblemSolvingScore(completed),
      trianglesCount: validation.trianglesCount || detectTriangles().length,
      failedReason,
      createdAt: new Date().toISOString(),
    };
  }

  async function saveGameResult(result) {
    try {
      console.log('Bridge Builder result', result);
      await savePhysicsBridgeLevelResult(studentId, level.id, result);
    } catch (error) {
      console.log('Bridge Builder result was kept locally only', error?.message || error);
    }
  }

  function resetLevel() {
    initializeLevel(levelNumber);
  }

  function goNextLevel() {
    if (levelNumber < 3) {
      setLevelNumber((current) => current + 1);
      setIntroVisible(false);
      return;
    }

    if (typeof navigateTo === 'function') {
      navigateTo('physicsBridgeLevelSelect');
    } else {
      navigation?.navigate?.('physicsBridgeLevelSelect');
    }
  }

  function getFailureTip(reason) {
    if (String(reason).includes('مثلث') || String(reason).includes('ضعيف')) {
      return 'جرّب بناء مثلثات تحت الطريق. المثلث أقوى من الخط المستقيم.';
    }
    if (String(reason).includes('ميزانية')) {
      return 'استخدم قطعاً أقل أو استبدل بعض الطرق بدعم أرخص.';
    }
    if (String(reason).includes('مائل')) {
      return 'اجعل الطريق تدريجياً حتى تستطيع السيارة الصعود بأمان.';
    }
    return 'ابدأ من A، أوصل الطريق إلى D، ثم أضف دعماً أسفل الجسر.';
  }

  function setTool(tool) {
    if (tool === TOOL.CABLE && level.materials.cable <= 0) {
      setMessage('السلك غير متاح في هذا المستوى.');
      return;
    }

    setSelectedTool(tool);
    setSelectedNodeId(null);
    setPreview(null);
    setMessage(tool === TOOL.ROAD
      ? 'اسحب بين نقطتين لبناء طريق للسيارة.'
      : tool === TOOL.WOOD
        ? 'ابنِ مثلثات دعم تحت الطريق.'
        : 'اربط السلك بين نقاط عالية لتقوية الجسر.');

    advanceTutorialStep(tool === TOOL.ROAD ? 'tool-road' : tool === TOOL.WOOD ? 'tool-wood' : 'tool-cable');
  }

  function handleNodePress(node) {
    if (isRunning) {
      return;
    }

    if (!isNodeUsableForTool(node, selectedTool)) {
      setMessage('هذه النقطة غير مناسبة للأداة المختارة.');
      return;
    }

    if (!selectedNodeId) {
      setSelectedNodeId(node.id);
      setSelectedSegmentId(null);
      setMessage('اختر هدفاً مضيئاً أو اسحب إليه.');
      return;
    }

    const fromNode = getNodeById(selectedNodeId);
    if (fromNode?.id === node.id) {
      setSelectedNodeId(null);
      setMessage('اختر نقطتين مختلفتين.');
      return;
    }

    const check = canBuildSegment(fromNode, node, selectedTool);
    if (!check.ok) {
      setMessage(check.reason);
      return;
    }

    addSegment(fromNode.id, node, selectedTool);
  }

  function handleTargetPress(target) {
    if (!selectedNodeId || isRunning || !target.valid) {
      setMessage(target.reason || 'هذه القطعة غير صالحة.');
      return;
    }

    addSegment(selectedNodeId, target, selectedTool);
  }

  function renderSegment(segment) {
    const fromNode = getNodeById(segment.fromNodeId);
    const toNode = getNodeById(segment.toNodeId);
    if (!fromNode || !toNode) {
      return null;
    }

    const length = getDistance(fromNode, toNode);
    const angle = getAngle(fromNode, toNode);
    const isSelected = selectedSegmentId === segment.id;
    const isFailed = failedSegmentId === segment.id;
    const color = segment.type === TOOL.ROAD ? COLORS.road : segment.type === TOOL.WOOD ? COLORS.wood : COLORS.cable;
    const thickness = segment.type === TOOL.ROAD ? 9 : segment.type === TOOL.WOOD ? 7 : 4;
    const midpoint = {
      x: (fromNode.x + toNode.x) / 2,
      y: (fromNode.y + toNode.y) / 2,
    };

    return (
      <Animated.View
        key={segment.id}
        style={[
          styles.segmentTouchBox,
          {
            left: midpoint.x - length / 2,
            top: midpoint.y - 18,
            width: length,
            height: 36,
            transform: [
              { rotate: `${angle}deg` },
              {
                translateX: bridgeShake.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-4, 0, 4],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => {
            setSelectedSegmentId(segment.id);
            setSelectedNodeId(null);
            setMessage('تم اختيار قطعة. اضغط حذف لإزالتها.');
          }}
          style={[
            styles.segment,
            {
              height: thickness,
              backgroundColor: isFailed ? COLORS.danger : color,
              borderColor: isSelected ? COLORS.success : 'rgba(255,255,255,0.75)',
              opacity: isFailed ? 0.45 : 1,
            },
          ]}
        />
      </Animated.View>
    );
  }

  function renderPreview() {
    if (!preview?.from || !preview?.to) {
      return null;
    }

    const toPoint = preview.to;
    const length = getDistance(preview.from, toPoint);
    const angle = getAngle(preview.from, toPoint);
    const midpoint = {
      x: (preview.from.x + toPoint.x) / 2,
      y: (preview.from.y + toPoint.y) / 2,
    };

    return (
      <View
        pointerEvents="none"
        style={[
          styles.previewSegment,
          {
            left: midpoint.x - length / 2,
            top: midpoint.y - 3,
            width: length,
            backgroundColor: preview.valid ? (preview.type === TOOL.ROAD ? COLORS.road : COLORS.wood) : COLORS.danger,
            transform: [{ rotate: `${angle}deg` }],
          },
        ]}
      />
    );
  }

  function renderNode(node) {
    const isSelected = selectedNodeId === node.id;
    const isUsable = isNodeUsableForTool(node, selectedTool);
    const isTutorialFocus = levelNumber === 1
      && ((tutorialStep === 2 && ['A'].includes(node.id)) || (tutorialStep === 4 && node.id === 'B'));

    return (
      <Pressable
        key={node.id}
        onPress={() => handleNodePress(node)}
        style={[
          styles.node,
          {
            left: node.x - 10,
            top: node.y - 10,
            borderColor: isSelected || isTutorialFocus ? COLORS.success : COLORS.primary,
            backgroundColor: isUsable ? '#FFFFFF' : '#EEF2FF',
            opacity: isUsable ? 1 : 0.45,
            transform: [{ scale: isSelected || isTutorialFocus ? 1.15 : 1 }],
          },
        ]}
      >
        {node.label ? <Text style={styles.nodeLabel}>{node.label}</Text> : null}
      </Pressable>
    );
  }

  function renderTarget(target) {
    return (
      <Pressable
        key={target.id}
        onPress={() => handleTargetPress(target)}
        style={[
          styles.snapTarget,
          {
            left: target.x - 8,
            top: target.y - 8,
            borderColor: target.valid ? COLORS.success : COLORS.danger,
            backgroundColor: target.valid ? 'rgba(46,204,113,0.18)' : 'rgba(231,76,60,0.12)',
          },
        ]}
      />
    );
  }

  const startNode = getNodeById('A') || { x: 68, y: 150 };
  const finishNode = getNodeById('D') || { x: boardSize.width - 68, y: 150 };
  const carTranslateX = carProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, finishNode.x - startNode.x)],
  });
  const carTranslateY = carDrop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 95],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation?.goBack?.()}>
            <Text style={styles.headerIconText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.levelTitle}>{level.title}</Text>
            <Text style={styles.goalText}>{level.goal}</Text>
          </View>

          <TouchableOpacity style={styles.headerIcon} onPress={() => setHelpVisible(true)}>
            <Text style={styles.headerIconText}>؟</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatChip label="الميزانية" value={`${budgetUsed} / ${level.budgetLimit}`} danger={budgetUsed > level.budgetLimit} />
          <StatChip label="الوقت" value={`${secondsLeft}ث`} danger={secondsLeft <= 15} />
          <StatChip label="المحاولات" value={attempts} />
        </View>

        <View style={styles.materialRow}>
          <MaterialPill label="طريق" value={remainingMaterials.road} active={selectedTool === TOOL.ROAD} />
          <MaterialPill label="دعم" value={remainingMaterials.wood} active={selectedTool === TOOL.WOOD} />
          <MaterialPill label="سلك" value={remainingMaterials.cable} active={selectedTool === TOOL.CABLE} disabled={level.materials.cable <= 0} />
        </View>

        {tutorialStep > 0 ? (
          <View style={styles.tutorialBar}>
            <Text style={styles.tutorialTitle}>تدريب سريع</Text>
            <Text style={styles.tutorialText}>{message}</Text>
          </View>
        ) : null}

        <View
          style={styles.boardCard}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setBoardSize({ width, height });
            scaleNodesToBoard(width, height);
          }}
          {...panResponder.panHandlers}
        >
          <View style={styles.gridOverlay}>
            {Array.from({ length: 12 }).map((_, index) => (
              <View key={`v-${index}`} style={[styles.gridLineVertical, { left: `${index * 9}%` }]} />
            ))}
            {Array.from({ length: 8 }).map((_, index) => (
              <View key={`h-${index}`} style={[styles.gridLineHorizontal, { top: `${index * 12}%` }]} />
            ))}
          </View>

          <View style={[styles.leftGround, { width: level.ground.leftWidth, top: `${level.ground.y * 100}%` }]} />
          <View style={[styles.rightGround, { width: level.ground.rightWidth, top: `${(level.ground.y - 0.03) * 100}%` }]} />
          <View style={styles.water}>
            <Text style={styles.waterText}>وادٍ</Text>
          </View>
          <View style={[styles.cliff, styles.leftCliff]} />
          <View style={[styles.cliff, styles.rightCliff]} />

          <Animated.View
            style={[
              styles.car,
              {
                left: startNode.x - 25,
                top: startNode.y - 34,
                transform: [{ translateX: carTranslateX }, { translateY: carTranslateY }],
              },
            ]}
          >
            <View style={styles.carBody}>
              <View style={styles.carCabin} />
            </View>
            <View style={styles.carWheels}>
              <View style={styles.carWheel} />
              <View style={styles.carWheel} />
            </View>
          </Animated.View>

          <View style={[styles.flag, { left: finishNode.x + 8, top: finishNode.y - 50 }]}>
            <View style={styles.flagPole} />
            <View style={styles.flagCloth} />
          </View>

          {segments.map(renderSegment)}
          {renderPreview()}
          {selectedNodeId ? availableTargets.map(renderTarget) : null}
          {nodes.map(renderNode)}
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionText}>{message}</Text>
        </View>

        <View style={styles.toolbar}>
          <ToolButton label="طريق" active={selectedTool === TOOL.ROAD} onPress={() => setTool(TOOL.ROAD)} />
          <ToolButton label="دعم" active={selectedTool === TOOL.WOOD} onPress={() => setTool(TOOL.WOOD)} />
          <ToolButton label="سلك" active={selectedTool === TOOL.CABLE} disabled={level.materials.cable <= 0} onPress={() => setTool(TOOL.CABLE)} />
          <ToolButton label="حذف" disabled={!segments.length} onPress={deleteLastSegment} danger />
          <ToolButton label="تشغيل" onPress={startSimulation} primary disabled={isRunning} />
          <ToolButton label="إعادة" onPress={resetLevel} />
        </View>
      </View>

      <IntroModal
        visible={introVisible}
        onStart={startTutorial}
        onClose={() => setIntroVisible(false)}
      />

      <HelpModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />

      <ResultModal
        modal={resultModal}
        levelNumber={levelNumber}
        onRetry={() => {
          setResultModal(null);
          resetLevel();
        }}
        onTip={() => {
          setResultModal((current) => current ? { ...current, showTip: true } : current);
        }}
        onNext={() => {
          setResultModal(null);
          goNextLevel();
        }}
      />
    </SafeAreaView>
  );
}

function StatChip({ label, value, danger = false }) {
  return (
    <View style={[styles.statChip, danger && styles.statChipDanger]}>
      <Text style={[styles.statLabel, danger && styles.statDangerText]}>{label}</Text>
      <Text style={[styles.statValue, danger && styles.statDangerText]}>{value}</Text>
    </View>
  );
}

function MaterialPill({ label, value, active, disabled }) {
  return (
    <View style={[styles.materialPill, active && styles.materialPillActive, disabled && styles.disabledPill]}>
      <Text style={[styles.materialLabel, active && styles.materialLabelActive]}>{label}</Text>
      <Text style={[styles.materialValue, active && styles.materialLabelActive]}>{disabled ? 'مقفل' : value}</Text>
    </View>
  );
}

function ToolButton({ label, active, disabled, onPress, primary, danger }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.toolButton,
        active && styles.toolButtonActive,
        primary && styles.toolButtonPrimary,
        danger && styles.toolButtonDanger,
        disabled && styles.toolButtonDisabled,
      ]}
    >
      <Text style={[
        styles.toolButtonText,
        (active || primary || danger) && styles.toolButtonTextActive,
        disabled && styles.disabledText,
      ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function IntroModal({ visible, onStart, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>ابنِ الجسر</Text>
          <Text style={styles.modalText}>
            استخدم قطع الطريق والدعم لبناء جسر يوصل السيارة إلى العلم. اسحب بين النقاط لبناء القطع. المثلثات تجعل الجسر أقوى.
          </Text>
          <TouchableOpacity style={styles.modalPrimaryButton} onPress={onStart}>
            <Text style={styles.modalPrimaryText}>ابدأ التدريب</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function HelpModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>طريقة اللعب</Text>
          <Text style={styles.modalText}>
            ابنِ طريقاً للسيارة، ثم استخدم الدعم لصنع مثلثات. اختر أداة، اضغط نقطة، ثم اسحب أو اضغط هدفاً مضيئاً. عند التشغيل تتحرك السيارة فوق الطريق فقط.
          </Text>
          <TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}>
            <Text style={styles.modalSecondaryText}>فهمت</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ResultModal({ modal, levelNumber, onRetry, onNext, onTip }) {
  if (!modal) {
    return null;
  }

  const result = modal.result || {};
  const success = modal.type === 'success';

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={[styles.modalTitle, !success && styles.failTitle]}>{modal.title}</Text>
          {success ? (
            <View style={styles.resultGrid}>
              <ResultLine label="النتيجة" value={`${result.score || 0} / 100`} />
              <ResultLine label="الميزانية" value={`${result.budgetUsed || 0} / ${result.budgetLimit || 0}`} />
              <ResultLine label="الاستقرار" value={`${result.stabilityScore || 0}%`} />
              <ResultLine label="الوقت" value={`${result.timeSpentSeconds || 0}ث`} />
              <ResultLine label="المحاولات" value={result.attempts || 1} />
            </View>
          ) : (
            <>
              <Text style={styles.modalText}>{modal.reason}</Text>
              {modal.showTip ? <Text style={styles.tipText}>{modal.tip}</Text> : null}
            </>
          )}

          <View style={styles.modalActions}>
            {success ? (
              <>
                <TouchableOpacity style={styles.modalSecondaryButton} onPress={onRetry}>
                  <Text style={styles.modalSecondaryText}>إعادة لتحسين النتيجة</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={onNext}>
                  <Text style={styles.modalPrimaryText}>{levelNumber < 3 ? 'المستوى التالي' : 'العودة للمستويات'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.modalSecondaryButton} onPress={onTip}>
                  <Text style={styles.modalSecondaryText}>عرض نصيحة</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={onRetry}>
                  <Text style={styles.modalPrimaryText}>حاول مرة أخرى</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ResultLine({ label, value }) {
  return (
    <View style={styles.resultLine}>
      <Text style={styles.resultLineValue}>{value}</Text>
      <Text style={styles.resultLineLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.background,
  },
  header: {
    minHeight: 72,
    borderRadius: 20,
    padding: 12,
    backgroundColor: COLORS.dark,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerIconText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-end',
  },
  levelTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
  },
  goalText: {
    color: '#DCE8FF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statChipDanger: {
    backgroundColor: '#FFF1F1',
    borderColor: '#FECACA',
  },
  statLabel: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '800',
  },
  statValue: {
    color: COLORS.dark,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  statDangerText: {
    color: COLORS.danger,
  },
  materialRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  materialPill: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialPillActive: {
    backgroundColor: '#EAF1FF',
    borderColor: COLORS.primary,
  },
  disabledPill: {
    opacity: 0.48,
  },
  materialLabel: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '800',
  },
  materialValue: {
    color: COLORS.dark,
    fontSize: 12,
    fontWeight: '900',
  },
  materialLabelActive: {
    color: COLORS.primary,
  },
  tutorialBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFD0FF',
    padding: 10,
    alignItems: 'flex-end',
  },
  tutorialTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  tutorialText: {
    color: COLORS.dark,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: 3,
  },
  boardCard: {
    flex: 1,
    minHeight: 280,
    maxHeight: 390,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.sky,
    shadowColor: '#102A68',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.38,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#C9D8F8',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#C9D8F8',
  },
  leftGround: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 120,
    backgroundColor: COLORS.ground,
    borderTopRightRadius: 24,
    borderTopWidth: 9,
    borderTopColor: COLORS.grass,
  },
  rightGround: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: 130,
    backgroundColor: COLORS.ground,
    borderTopLeftRadius: 24,
    borderTopWidth: 9,
    borderTopColor: COLORS.grass,
  },
  cliff: {
    position: 'absolute',
    bottom: 62,
    width: 32,
    height: 72,
    backgroundColor: '#76543E',
    opacity: 0.82,
  },
  leftCliff: {
    left: 76,
    borderTopRightRadius: 20,
  },
  rightCliff: {
    right: 76,
    borderTopLeftRadius: 20,
  },
  water: {
    position: 'absolute',
    left: 78,
    right: 78,
    bottom: 0,
    height: 68,
    backgroundColor: COLORS.water,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterText: {
    color: '#2775A8',
    fontSize: 12,
    fontWeight: '900',
  },
  car: {
    position: 'absolute',
    width: 50,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 18,
  },
  carBody: {
    width: 42,
    height: 18,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row-reverse',
    paddingHorizontal: 7,
  },
  carCabin: {
    width: 14,
    height: 9,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: '#BFE7FF',
  },
  carWheels: {
    width: 34,
    marginTop: -2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  carWheel: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dark,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  flag: {
    position: 'absolute',
    width: 34,
    height: 54,
    zIndex: 10,
  },
  flagPole: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    width: 4,
    height: 54,
    borderRadius: 2,
    backgroundColor: COLORS.dark,
  },
  flagCloth: {
    position: 'absolute',
    top: 3,
    left: 8,
    width: 24,
    height: 16,
    backgroundColor: COLORS.danger,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  segmentTouchBox: {
    position: 'absolute',
    justifyContent: 'center',
    zIndex: 12,
  },
  segment: {
    borderRadius: 10,
    borderWidth: 1,
  },
  previewSegment: {
    position: 'absolute',
    height: 6,
    borderRadius: 8,
    opacity: 0.72,
    zIndex: 13,
  },
  node: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  nodeLabel: {
    color: COLORS.dark,
    fontSize: 9,
    fontWeight: '900',
  },
  snapTarget: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    zIndex: 17,
  },
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  instructionText: {
    color: COLORS.dark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'right',
  },
  toolbar: {
    flexDirection: 'row-reverse',
    gap: 6,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  toolButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 4,
  },
  toolButtonActive: {
    backgroundColor: '#EAF1FF',
    borderColor: COLORS.primary,
  },
  toolButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    flex: 1.18,
  },
  toolButtonDanger: {
    backgroundColor: '#FFF1F1',
    borderColor: '#FECACA',
  },
  toolButtonDisabled: {
    opacity: 0.42,
  },
  toolButtonText: {
    color: COLORS.dark,
    fontSize: 12,
    fontWeight: '900',
  },
  toolButtonTextActive: {
    color: '#FFFFFF',
  },
  disabledText: {
    color: COLORS.secondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,42,104,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  modalTitle: {
    color: COLORS.dark,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right',
  },
  failTitle: {
    color: COLORS.danger,
  },
  modalText: {
    color: COLORS.secondary,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'right',
  },
  tipText: {
    color: COLORS.dark,
    backgroundColor: '#FFF7E8',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE2B5',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  modalPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#F6F8FF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalSecondaryText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  resultGrid: {
    gap: 8,
  },
  resultLine: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: '#F6F8FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultLineLabel: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '800',
  },
  resultLineValue: {
    color: COLORS.dark,
    fontSize: 13,
    fontWeight: '900',
  },
});
