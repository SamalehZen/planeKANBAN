import { forwardRef, useMemo } from "react";
// components
import { EditorWrapper } from "@/components/editors/editor-wrapper";
import { EditorBubbleMenu } from "@/components/menus";
// extensions
import { EnterKeyExtension } from "@/extensions";
// types
import type { EditorRefApi, ILiteTextEditorProps } from "@/types";

function LiteTextEditor(props: ILiteTextEditorProps) {
  const {
    aiHandler,
    bubbleMenuEnabled = true,
    disabledExtensions,
    extendedEditorProps,
    flaggedExtensions,
    onEnterKeyPress,
    extensions: externalExtensions = [],
  } = props;

  const extensions = useMemo(() => {
    const resolvedExtensions = [...externalExtensions];

    if (!disabledExtensions?.includes("enter-key")) {
      resolvedExtensions.push(EnterKeyExtension(onEnterKeyPress));
    }

    return resolvedExtensions;
  }, [externalExtensions, disabledExtensions, onEnterKeyPress]);

  return (
    <EditorWrapper {...props} extensions={extensions}>
      {(editor) => (
        <>
          {editor && bubbleMenuEnabled && (
            <EditorBubbleMenu
              aiSelectionHandler={aiHandler?.onSelectionAction}
              disabledExtensions={disabledExtensions}
              editor={editor}
              extendedEditorProps={extendedEditorProps}
              flaggedExtensions={flaggedExtensions}
            />
          )}
        </>
      )}
    </EditorWrapper>
  );
}

const LiteTextEditorWithRef = forwardRef(function LiteTextEditorWithRef(
  props: ILiteTextEditorProps,
  ref: React.ForwardedRef<EditorRefApi>
) {
  return <LiteTextEditor {...props} forwardedRef={ref as React.MutableRefObject<EditorRefApi | null>} />;
});

LiteTextEditorWithRef.displayName = "LiteTextEditorWithRef";

export { LiteTextEditorWithRef };
