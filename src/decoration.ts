/*---------------------------------------------------------------------------------------------
*  Copyright (c) Alessandro Fragnani. All rights reserved.
*  Licensed under the GPLv3 License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { DecorationRenderOptions, OverviewRulerLane, Range, TextEditor, TextEditorDecorationType, ThemeColor, Uri, workspace, window } from "vscode";
import { createLineDecoration } from "vscode-ext-decoration";
import { DEFAULT_GUTTER_ICON_NUMBER_COLOR, DEFAULT_GUTTER_ICON_FILL_COLOR, MAX_BOOKMARKS, NO_BOOKMARK_DEFINED } from "../vscode-numbered-bookmarks-core/src/constants";
import { File } from "../vscode-numbered-bookmarks-core/src/file";
import { clearBookmarks } from "../vscode-numbered-bookmarks-core/src/operations";

function createGutterRulerDecoration(
    overviewRulerLane?: OverviewRulerLane,
    overviewRulerColor?: string | ThemeColor,
    gutterIconPath?: string | Uri): TextEditorDecorationType {

    const decorationOptions: DecorationRenderOptions = {
        gutterIconPath,
        overviewRulerLane,
        overviewRulerColor
    };

    decorationOptions.isWholeLine = false;

    return window.createTextEditorDecorationType(decorationOptions);
}

export interface TextEditorDecorationTypePair {
    gutterDecoration: TextEditorDecorationType;
    lineDecoration: TextEditorDecorationType;
}

export function createBookmarkDecorations(): TextEditorDecorationTypePair[] {
    const decorators: TextEditorDecorationTypePair[] = [];
    for (let number = 0; number <= 9; number++) {
        const iconFillColor = workspace.getConfiguration("numberedBookmarks").get("gutterIconFillColor", DEFAULT_GUTTER_ICON_FILL_COLOR);
        const iconNumberColor = workspace.getConfiguration("numberedBookmarks").get("gutterIconNumberColor", DEFAULT_GUTTER_ICON_NUMBER_COLOR);
        const iconPath = Uri.parse(
            `data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg"> <g fill="none" stroke="${iconFillColor}" stroke-width="1"> <line x1="2" y1="15" x2="2" y2="2"></line> <line x1="12" y1="15" x2="12" y2="2"></line> <line x1="2" y1="15" x2="12" y2="15"></line> </g> <text text-anchor="middle" alignment-baseline="middle" x="7" y="10" fill="${iconNumberColor}" font-weight="bold" font-size="13" font-family="monospace">${String.fromCharCode(97+number)}</text> </svg>`,
            )}`,
        );
        
        const overviewRulerColor = new ThemeColor('numberedBookmarks.overviewRuler');
        const lineBackground = new ThemeColor('numberedBookmarks.lineBackground');
        const lineBorder = new ThemeColor('numberedBookmarks.lineBorder');

        const gutterDecoration = createGutterRulerDecoration(OverviewRulerLane.Full, overviewRulerColor, iconPath);
        const lineDecoration = createLineDecoration(lineBackground, lineBorder);
        decorators.push( { gutterDecoration, lineDecoration });
    }
    return decorators;
}

export function updateDecorationsInActiveEditor(activeEditor: TextEditor, activeBookmark: File,
    getDecorationPair: (n: number) => TextEditorDecorationTypePair) {
    
    if (!activeEditor) {
        return;
    }

    if (!activeBookmark) {
        return;
    }

    let books: Range[] = [];
    // Remove all bookmarks if active file is empty
    if (activeEditor.document.lineCount === 1 && activeEditor.document.lineAt(0).text === "") {
        clearBookmarks(activeBookmark);
    } else {
        const invalids = [];
        for (let index = 0; index < MAX_BOOKMARKS; index++) {
            books = [];
            if (activeBookmark.bookmarks[ index ].line < 0) {
                const decors = getDecorationPair(index);
                activeEditor.setDecorations(decors.gutterDecoration, books);
                activeEditor.setDecorations(decors.lineDecoration, books);
            } else {
                const element = activeBookmark.bookmarks[ index ];
                if (element.line < activeEditor.document.lineCount) {
                    const decoration = new Range(element.line, 0, element.line, 0);
                    books.push(decoration);
                    const decors = getDecorationPair(index);
                    activeEditor.setDecorations(decors.gutterDecoration, books);
                    activeEditor.setDecorations(decors.lineDecoration, books);
                } else {
                    invalids.push(index);
                }
            }
        }

        if (invalids.length > 0) {
            // tslint:disable-next-line:prefer-for-of
            for (let indexI = 0; indexI < invalids.length; indexI++) {
                activeBookmark.bookmarks[ invalids[ indexI ] ] = NO_BOOKMARK_DEFINED;
            }
        }
    }
}
