window.onload = function () {
  var currentSelection;
  var annotations = [];
  var currentHistoryIndex = null;

  historyLog = function (annos) {
    annotations.push(annos);
    currentHistoryIndex = annotations.length - 1;
    console.log("historyLog", annotations);
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
  };

  // Initialize the Annotorious plugin
  var anno = OpenSeadragon.Annotorious(viewer, config);

  anno.on("createSelection", async function (selection) {
    selection.body = [
      {
        type: "TextualBody",
        purpose: "tagging",
        value: "MyOtherTag",
      },
    ];

    await anno.updateSelected(selection);
    anno.saveSelected();

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
    historyLog(anno.getAnnotations());
  });

  anno.on("updateAnnotation", function (annotation, previous) {
    console.log("updated", previous, "with", annotation);
    // historyLog(anno.getAnnotations());
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
  var drawBtn = document.getElementById("draw");
  drawBtn.addEventListener("click", function () {
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

      historyLog(anno.getAnnotations());
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

      historyLog(anno.getAnnotations());
    }
  });

  /**
   * UNDO
   */
  var undoBtn = document.getElementById("undo");
  undoBtn.addEventListener("click", function () {
    if (annotations.length === 0) {
      return;
    }

    currentHistoryIndex = currentHistoryIndex - 1;
    if (currentHistoryIndex < 0) {
      console.log("currentHistoryIndex=0");
      anno.setAnnotations([]);
    } else {
      console.log("currentHistoryIndex", currentHistoryIndex);
      anno.setAnnotations(annotations[currentHistoryIndex]);
    }

    anno.setDrawingEnabled(false);
  });

  /**
   * REDO
   */
  var redoBtn = document.getElementById("redo");
  redoBtn.addEventListener("click", function () {
    annos_count = annotations.length - 1;

    currentHistoryIndex =
      currentHistoryIndex === annos_count
        ? currentHistoryIndex
        : currentHistoryIndex + 1;
    anno.setAnnotations(annotations[currentHistoryIndex]);
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

      historyLog(anno.getAnnotations());
    }
  });
};
