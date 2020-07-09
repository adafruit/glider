
import React, { useState, useEffect } from 'react';
import {ActivityIndicator, FlatList, Platform, TextInput, KeyboardAvoidingView, Text, View, StyleSheet} from 'react-native';
import {AnalyzerService} from './pyright/server/src/analyzer/service';
import {ArgumentCategory, ParseNodeType} from './pyright/server/src/parser/parseNodes';
import {TokenType, KeywordType} from './pyright/server/src/parser/tokenizerTypes';
import { useTheme } from '@react-navigation/native';

var firstAnalyzerRun = true;
const analyzer = new AnalyzerService("");
const font = Platform.OS === 'android' ? "monospace" : "Menlo-Regular";


function Code(props) {
    const { colors } = useTheme();
    return (<Text  {...props} style={[props.style, {fontFamily: font},{ color: colors.text }]}/>);
}

function CodeInput(props) {
    const { colors } = useTheme();
    let [oldValue, setOldValue] = useState(props.children);
    let [newValue, setNewValue] = useState(props.children);
    let [changeTimeout, setChangeTimeout] = useState(0);
    let debugStyle = {};
    if (Platform.OS === 'android') {
        debugStyle = {"borderColor": "red", "borderWidth": 2};
    }
    function patch(offset, oldValue, newValue) {
        setChangeTimeout(0);
        setOldValue(newValue);
        console.log(performance.now(), "patch", offset, oldValue, newValue);
        props.changeCode({"type": "patch", "offset": offset, "oldValue": oldValue, "newValue": newValue});
    }
    function onChange(newText) {
        setNewValue(newText);
        if (changeTimeout > 0) {
            clearTimeout(changeTimeout);
        }
        if (newText.length > 0) {
            let timeout = setTimeout(patch, 1000, props.offset, oldValue, newText);
            setChangeTimeout(timeout);
        }
    }
    function onDone() {
        if (changeTimeout > 0) {
            clearTimeout(changeTimeout);
            setChangeTimeout(0);
        }
        if (oldValue != newValue) {
            console.log("done");
            if (newValue.length > 0) {
                patch(props.offset, oldValue, newValue);
            }
        }
    }
    return (<TextInput {...props} style={[props.style, {fontFamily: font, paddingVertical: 0, textAlignVertical: 'top'}, debugStyle]} onChangeText={onChange} onEndEditing={onDone}>{newValue}</TextInput>);
}

const styles = StyleSheet.create({
    keyword: {
      color: 'blue',
    },
  });

function Indent({amount, index, parent}) {
    let whitespace = "    ";
    var { colors } = useTheme();
    return (<Code style={index % 2 == 0 ? {backgroundColor: colors.card} : {backgroundColor: colors.card}}>{whitespace}</Code>);
}

function renderKeyword(token, changeCode) {
    if (token.keywordType == KeywordType.True || token.keywordType == KeywordType.False) {
        let value = token.keywordType == KeywordType.True ? "True" : "False";
        return (<CodeInput placeholder="bool"
                            style={styles.keyword}
                            editable={true}
                            multiline={false}>{value}</CodeInput>);
    }
    console.log("keyword", token.keywordType);
}

//
function renderToken(token, changeCode) {
    switch (token.type) {
        case TokenType.Keyword:
            return renderKeyword(token, changeCode);
            break;
        default:
            break;
    }
    console.log("Token", token.type, token);
}

function renderParseNode(node, changeCode) {
    const { colors } = useTheme();
    switch (node.nodeType) {
        case ParseNodeType.Argument:
            if (node.argumentCategory == ArgumentCategory.Simple) {
                return renderParseNode(node.valueExpression, changeCode);
            }
            break;
        case ParseNodeType.Assignment:
            return (<View style={{flex: 1, flexDirection: 'row'}}>{renderParseNode(node.leftExpression, changeCode)}<Code> = </Code>{renderParseNode(node.rightExpression, changeCode)}</View>);
            break;
        case ParseNodeType.BinaryOperation:
            return (<View style={{flexDirection: 'row'}}>{renderParseNode(node.leftExpression, changeCode)}<Code> ?? </Code>{renderParseNode(node.rightExpression, changeCode)}</View>);
            break;
        case ParseNodeType.Call:{
            var a = [];
            for (var argument of node.arguments) {
                if (a.length > 0) {
                    a.push(<Code key={a.length}>, </Code>);
                }
                a.push(<View key={a.length}>{renderParseNode(argument, changeCode)}</View>);
            }
            return (<View style={{flex: 1, flexDirection: 'row'}}>{renderParseNode(node.leftExpression, changeCode)}<Code>(</Code>{a}<Code>)</Code></View>);
        }

            break;
        case ParseNodeType.Constant:
            return (<View style={{flex: 0, flexDirection: 'row'}}>{renderToken(node.token, changeCode)}</View>);
        case ParseNodeType.Function:
            return (<View style={{flexDirection: 'row'}}><Code>def </Code>{renderParseNode(node.name, changeCode)}<Code>(</Code>{renderParseNode(node.parameters[0], changeCode)}<Code>):</Code></View>);
        case ParseNodeType.If:
            return (<View style={{flexDirection: 'row'}}><Code>if </Code>{renderParseNode(node.testExpression, changeCode)}<Code>:</Code></View>);
        case ParseNodeType.Import:
            if (node.list.length == 1) {
                return (<View style={{flex: 0, flexDirection: 'row'}}><Code>import </Code>{renderParseNode(node.list[0], changeCode)}</View>);
            }

            break;
        case ParseNodeType.ImportAs:
                if (node.alias) {
                    // not supported
                } else {
                    return renderParseNode(node.module, changeCode);
                }

                break;
        case ParseNodeType.Index:
                return (<View style={{flexDirection: 'row'}}>{renderParseNode(node.baseExpression, changeCode)}<Code>[</Code>{renderParseNode(node.items, changeCode)}<Code>]</Code></View>);

                break;
        case ParseNodeType.IndexItems:
            if (node.items.length == 1) {
                return renderParseNode(node.items[0], changeCode);
            }
            sbreak;
        case ParseNodeType.MemberAccess:
                return (<View style={{flexDirection: 'row'}}>{renderParseNode(node.leftExpression, changeCode)}<Code>.</Code>{renderParseNode(node.memberName, changeCode)}</View>);

                break;
        case ParseNodeType.Name: {
                return (<CodeInput placeholder="module"
                                    editable={true}
                                    multiline={true}
                                    style={{color: colors.text}}
                                    //onChangeText={ (newText) => props.changeCode({"type": "replaceAll", "data": newText })}
                                    >{node.nameToken.value}</CodeInput>);
                break;
        }
        case ParseNodeType.Number: {
                let keyboardType = "decimal-pad";
                let value = node.token.stringValue;
                if (node.token.radix == 16) {
                    keyboardType = "default";
                }
                return (<CodeInput placeholder="number"
                                    editable={true}
                                    multiline={true}
                                    keyboardType={keyboardType}
                                    changeCode={changeCode}
                                    offset={node.start}
                                    style={{color: colors.text}}
                                    >{value}</CodeInput>);
                break;
        }
        case ParseNodeType.Parameter:
            return renderParseNode(node.name, changeCode);
        case ParseNodeType.ModuleName: {
                if (node.leadingDots == 0 && node.nameParts.length == 1) {
                    return renderParseNode(node.nameParts[0], changeCode);
                }
                break;
        }
        case ParseNodeType.StatementList:
            if (node.statements.length == 1) {
                return renderParseNode(node.statements[0], changeCode);
            }
            break;
        case ParseNodeType.While:
            console.log("while", node);
            return (<View style={{flexDirection: 'row'}}><Code>while </Code>{renderParseNode(node.testExpression, changeCode)}<Code>:</Code></View>);
            break;
        default:
            break;
    }
            console.log("unsupported", node.nodeType, node);
}


function CodeLine(props) {
    let parseNode = props.line.node;
    console.log(props.line);
    let code;
    if (parseNode == "empty") {
        code = (<CodeInput placeholder=""
                            editable={true}
                            multiline={false}
                            //onChangeText={ (newText) => props.changeCode({"type": "replaceAll", "data": newText })}
                            />);
    } else {
        code = renderParseNode(parseNode, props.changeCode);
    }

    let indents = props.line.indents.flatMap((value, index) => (<Indent amount={value[0]} index={index} key={index} parent={value[1]}/>));
    return (<View style={{flex: 1, flexDirection: 'row'}}><Code>{props.index+1 + " "}</Code>{indents}{code}</View>);
};


export default function CodeEditor(props) {
    const [lines, setLines] = useState([]);
    const [unparsable, setUnparsable] = useState(false);

    function analysisComplete(results) {
        if (!results) {
            return;
        }
        console.log(results);
        if (results.fatalErrorOccurred) {
            setUnparsable(true);
            return;
        } else {
            setUnparsable(false);
        }

        let diagnostics = results.diagnostics[0];
        let lineRanges = diagnostics.parseResults.lines._items;
        let lines = new Array();
        let comments = new Array();
        for (var token of diagnostics.parseResults.tokens._items) {
            if (token.comments) {
                comments.push(...token.comments);
            }
        }
        let statements = [];
        statements.push(...diagnostics.parseResults.parseTree.statements);
        let indent = 0;
        let indents = [];
        let emptyCount = 0;
        for (line of lineRanges) {
            if (line.length == 1) {
                lines.push({indents: Array.from(indents), node: "empty", id: "empty" + emptyCount});
                emptyCount += 1;
                continue;
            }
            if (statements[0] == "popscope" || statements[0] == "pushscope") {
                let scope = statements.shift();
                if (scope == "popscope" && line.length != indent) {
                    lines.push({indents: Array.from(indents), node: "empty", id: "empty" + emptyCount});
                    emptyCount += 1;
                }
                // recompute indent
                let newIndent = statements[0].start - line.start;
                if (scope == "pushscope") {
                    // Include the last parse node so the empty space know what it belongs to
                    console.log(lines, lines.length);
                    indents.push([newIndent - indent, lines[lines.length - 1][1]]);
                } else {
                    indents.pop();
                    // verify our new indent matches the computed value
                }
                indent = newIndent;
            }
            let parseNode = statements.shift();
            if (!parseNode) {
                console.log(line, parseNode);
            } else if (parseNode &&
                       parseNode.start == line.start + indent &&
                       (parseNode.length == line.length - 1 - indent ||
                        parseNode.length == line.length - indent)) {
                lines.push({indents: Array.from(indents), node: parseNode, id: parseNode.start.toString()});
            } else {
                if (parseNode.nodeType == ParseNodeType.If) { // if statement
                    lines.push({indents: Array.from(indents), node: parseNode, id: parseNode.start.toString()});
                    statements.unshift("pushscope", ...parseNode.ifSuite.statements, "popscope");
                    // handle an else suite
                } else if (parseNode.nodeType == ParseNodeType.While) { // while loop
                    lines.push({indents: Array.from(indents), node: parseNode, id: parseNode.start.toString()});
                    statements.unshift("pushscope", ...parseNode.whileSuite.statements, "popscope");
                } else if (parseNode.nodeType == ParseNodeType.Function) { // function def
                    lines.push({indents: Array.from(indents), node: parseNode, id: parseNode.start.toString()});
                    statements.unshift("pushscope", ...parseNode.suite.statements, "popscope");
                } else {
                    console.log("unhandled node", parseNode, line, indent);
                }
            }
        }
        console.log(statements);
        console.log(lines);
        setLines(lines);
    };
    useEffect(() => {
        analyzer.setCompletionCallback(analysisComplete);

        console.log("file updated", props.fileName, props.fileVersion, props.code);
        if (firstAnalyzerRun) {
            analyzer.setFileOpened(props.fileName, props.fileVersion, props.code);
            firstAnalyzerRun = false;
        } else {
            analyzer.updateOpenFileContents(props.fileName, props.fileVersion, props.code);
        }
    }, [props.fileName, props.fileVersion, props.code]);

    let editor;
    if (props.fileState == "loading") {
        editor = (<ActivityIndicator size="large" color="#00ff00" />);
    } else if (props.fileState == "loaded") {
        // Fallback to multiline text editor if the source is unparseable.
        if (unparsable) {
            editor = <CodeInput multiline={true} offset={0} style={{color: colors.text}}>{props.code}</CodeInput>;
        } else {
            console.log("howdy");
            console.log(lines);
            editor = (<FlatList
                                data={lines}
                                renderItem={({item, index}) => <CodeLine index={index} line={item} changeCode={props.changeCode}/>}
                            />);
        }
    }
    return (<KeyboardAvoidingView behavior="padding" enabled>
                {editor}
            </KeyboardAvoidingView>);
}
