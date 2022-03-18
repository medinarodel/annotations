window.onload = function () {
  const RED_ANNOTATION = "red";
  const BLUE_ANNOTATION = "blue";

  const REMOVE_ACTION = "remove";
  const MOVE_ACTION = "move";
  const CREATE_ACTION = "create";

  var currentSelection;
  var annotations = [];
  var currentHistoryIndex = null;
  var annotationType = null;

  historyLog = function (annotation) {
    annotations.push(annotation);
    currentHistoryIndex = annotations.length - 1;

    console.log("historyLog", annotations);
  };

  formatter = function (selection) {
    return selection.bodies[0]?.type;
  };

  var viewer = OpenSeadragon({
    id: "openseadragon1",
    tileSources: {
      type: "image",
      url: "https://raw.githubusercontent.com/recogito/annotorious/main/public/640px-Hallstatt.jpg",
    },
    innerTracker: {
      keyHandler: null,
    },
    showNavigationControl: false,
  });

  var config = {
    locale: "auto",
    disableEditor: true,
    allowEmpty: true,
    formatter: formatter,
  };

  // Initialize the Annotorious plugin
  var anno = OpenSeadragon.Annotorious(viewer, config);

  anno.on("createSelection", async function (selection) {
    selection.body = [
      {
        type: annotationType,
        purpose: "tagging",
        value: "MyOtherTag",
      },
    ];

    await anno.updateSelected(selection, true);

    anno.setDrawingEnabled(true);
    anno.setDrawingTool("rect");
  });

  anno.on("selectAnnotation", function (a) {
    console.log("selectAnnotation", a);
    currentSelection = a;
  });

  anno.on("cancelSelected", function (a) {
    console.log("cancelSelected", a);
    currentSelection = null;
  });

  anno.on("createAnnotation", function (a) {
    console.log("created", a);
    historyLog({
      action: CREATE_ACTION,
      annotation: a,
    });
  });

  anno.on("updateAnnotation", function (annotation, previous) {
    console.log("updated", previous, "with", annotation);
  });

  anno.on("mouseEnterAnnotation", function (a) {
    // console.log('enter');
  });

  anno.on("mouseLeaveAnnotation", function (a) {
    // console.log('leave');
  });

  anno.on("changeSelectionTarget", function (target) {
    // console.log('changeSelectionTarget', target.selector.value);
  });

  /**
   * DRAW
   */
  var redDrawBtn = document.getElementById("red-draw");
  redDrawBtn.addEventListener("click", function () {
    annotationType = RED_ANNOTATION;
    anno.setDrawingEnabled(true);
    anno.setDrawingTool("rect");
  });

  var blueDrawBtn = document.getElementById("blue-draw");
  blueDrawBtn.addEventListener("click", function () {
    annotationType = BLUE_ANNOTATION;
    anno.setDrawingEnabled(true);
    anno.setDrawingTool("rect");
  });

  /**
   * SELECT
   */
  var selectBtn = document.getElementById("select");
  selectBtn.addEventListener("click", function () {
    anno.setDrawingEnabled(false);
  });

  /**
   * DUPLICATE
   * required: currentSelection present
   */
  var duplicateBtn = document.getElementById("duplicate");
  duplicateBtn.addEventListener("click", async () => {
    if (currentSelection) {
      const newAnnotation = {
        ...currentSelection,
        id: uuid.v4(),
        type: "Annotation",
      };
      anno.addAnnotation(newAnnotation);
      await anno.updateSelected(currentSelection, true);

      selected = anno.getAnnotationById(newAnnotation.id);
      currentSelection = selected;
      anno.selectAnnotation(currentSelection);

      historyLog({
        action: CREATE_ACTION,
        annotation: currentSelection,
      });
    }
  });

  /**
   * REMOVE
   * required: currentSelection present
   */
  var removeBtn = document.getElementById("remove");
  removeBtn.addEventListener("click", async () => {
    if (currentSelection) {
      anno.removeAnnotation(currentSelection);
      anno.cancelSelected();

      historyLog({
        action: REMOVE_ACTION,
        annotation: currentSelection,
      });
    }
  });

  /**
   * UNDO
   */
  var undoBtn = document.getElementById("undo");
  undoBtn.addEventListener("click", async () => {
    if (annotations.length === 0 || currentHistoryIndex < 0) {
      return;
    }

    currentHistoryIndex = currentHistoryIndex - 1;
    const prevAction = annotations[currentHistoryIndex];

    if (prevAction) {
      if (prevAction.action === CREATE_ACTION) {
        anno.removeAnnotation(prevAction.annotation);
        anno.cancelSelected();
        return;
      }

      if (
        prevAction.action === REMOVE_ACTION ||
        prevAction.action === MOVE_ACTION
      ) {
        let prevAnnotation = prevAction.annotation;
        const newAnnotation = {
          ...prevAnnotation,
          id: uuid.v4(),
          type: "Annotation",
        };
        anno.removeAnnotation(prevAnnotation);
        anno.cancelSelected();
        anno.addAnnotation(newAnnotation);
        await anno.updateSelected(prevAnnotation, true);

        selected = anno.getAnnotationById(newAnnotation.id);
        prevAnnotation = selected;
        anno.selectAnnotation(prevAnnotation);
      }
    }

    anno.setDrawingEnabled(false);
  });

  /**
   * REDO
   */
  var redoBtn = document.getElementById("redo");
  redoBtn.addEventListener("click", async () => {
    if (annotations.length === 0 || currentHistoryIndex >= annotations.length) {
      return;
    }

    currentHistoryIndex = currentHistoryIndex + 1;
    const prevAction = annotations[currentHistoryIndex];

    if (prevAction) {
      if (prevAction.action === REMOVE_ACTION) {
        anno.removeAnnotation(prevAction.annotation);
        anno.cancelSelected();
        return;
      }

      if (
        prevAction.action === CREATE_ACTION ||
        prevAction.action === MOVE_ACTION
      ) {
        let prevAnnotation = prevAction.annotation;
        const newAnnotation = {
          ...prevAnnotation,
          id: uuid.v4(),
          type: "Annotation",
        };
        anno.removeAnnotation(prevAnnotation);
        anno.cancelSelected();
        anno.addAnnotation(newAnnotation);
        await anno.updateSelected(prevAnnotation, true);

        selected = anno.getAnnotationById(newAnnotation.id);
        prevAnnotation = selected;
        anno.selectAnnotation(prevAnnotation);
      }
    }

    anno.setDrawingEnabled(false);
  });

  /**
   * DRAG EVENT
   */
  let drag = false;

  document.addEventListener("mousedown", () => (drag = false));
  document.addEventListener("mousemove", () => (drag = true));
  document.addEventListener("mouseup", async () => {
    if (drag && currentSelection) {
      const outerElement = document.querySelectorAll(
        `[data-id="${currentSelection.id}"]  .a9s-outer`
      )[0];

      if (!outerElement) {
        console.log("outerElement not found", currentSelection.id);
        return;
      }

      const attr = outerElement.attributes;

      const value = `xywh=pixel:${attr.x.value},${attr.y.value},${attr.width.value},${attr.height.value}`;

      const newSelection = {
        ...currentSelection,
        target: {
          ...currentSelection.target,
          selector: { ...currentSelection.target.selector, value },
        },
      };

      await anno.updateSelected(newSelection, true);

      selected = anno.getAnnotationById(newSelection.id);
      currentSelection = selected;
      anno.selectAnnotation(currentSelection);

      historyLog({
        action: MOVE_ACTION,
        annotation: currentSelection,
      });
    }
  });
};
