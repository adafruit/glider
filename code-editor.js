
import React, { useState } from 'react';
import {ActivityIndicator, FlatList, Platform, TextInput, KeyboardAvoidingView, Text, View, StyleSheet} from 'react-native';

import {AnalyzerService} from './pyright/server/src/analyzer/service';
import {ArgumentCategory, ParseNodeType} from './pyright/server/src/parser/parseNodes';
import {TokenType, KeywordType} from './pyright/server/src/parser/tokenizerTypes';

const analyzer = new AnalyzerService("");
const font = "monospace";

function Code(props) {
    return (<Text {...props} style={[props.style, {fontFamily: font}]}/>);
}

function CodeInput(props) {
    return (<TextInput {...props} style={[props.style, {fontFamily: font, "borderColor": "red", "borderWidth": 2, paddingVertical: 0, textAlignVertical: 'top'}]} />);
}

const styles = StyleSheet.create({
    keyword: {
      color: 'blue',
    },
  });

function Indent({amount, index, parent}) {
    let whitespace = "    ";
    return (<Code style={index % 2 == 0 ? {backgroundColor: "white"} : {backgroundColor: "lightpink"}}>{whitespace}</Code>);
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
    switch (node.nodeType) {
        case ParseNodeType.Argument:
            if (node.argumentCategory == ArgumentCategory.Simple) {
                return renderParseNode(node.valueExpression, changeCode);
            }
            break;
        case ParseNodeType.Assignment:
            return (<View style={{flex: 1, flexDirection: 'row'}}>{renderParseNode(node.leftExpression, changeCode)}<Code> = </Code>{renderParseNode(node.rightExpression, changeCode)}</View>);
            break;
        case ParseNodeType.Call:{
            var a = [];
            for (argument of node.arguments) {
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
        case ParseNodeType.Import:
            if (node.list.length == 1) {
                return (<View style={{flex: 0, flexDirection: 'row'}}><Code style={{fontFamily: 'Menlo-Regular'}}>import </Code>{renderParseNode(node.list[0], changeCode)}</View>);
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
                console.log(node);
                return (<CodeInput placeholder="module"
                                    editable={true}
                                    multiline={false}
                                    //onChangeText={ (newText) => props.changeCode({"type": "replaceAll", "data": newText })}
                                    >{node.nameToken.value}</CodeInput>);
                break;
        }
        case ParseNodeType.Number: {
                console.log("number", node.token.value, node);
                return (<CodeInput placeholder="number"
                                    editable={true}
                                    multiline={false}
                                    keyboardType="decimal-pad"
                                    //onChangeText={ (newText) => props.changeCode({"type": "replaceAll", "data": newText })}
                                    >{node.token.value}</CodeInput>);
                break;
        }
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
    console.log(props.line);
    let parseNode = props.line[1];
    let code;
    if (parseNode == "empty") {
        code = (<CodeInput placeholder="pass"
                            editable={true}
                            multiline={false}
                            //onChangeText={ (newText) => props.changeCode({"type": "replaceAll", "data": newText })}
                            />);
    } else {
        code = renderParseNode(parseNode, props.changeCode);
    }
    let indents = props.line[0].flatMap((value, index) => (<Indent amount={value[0]} index={index} key={index} parent={value[1]}/>));
    return (<View style={{flex: 1, flexDirection: 'row'}}>{indents}{code}</View>);
};

export default function CodeEditor(props) {
    const [lines, setLines] = useState([]);

    function analysisComplete(results) {
        if (!results) {
            return;
        }
        console.log(results);
        let diagnostics = results.diagnostics[0];
        let lineRanges = diagnostics.parseResults.lines._items;
        let lines = new Array();
        let statements = [];
        statements.push(...diagnostics.parseResults.parseTree.statements);
        let indent = 0;
        let indents = [];
        for (line of lineRanges) {
            if (line.length == 1) {
                lines.push([Array.from(indents), "empty"]);
                continue;
            }
            if (statements[0] == "popscope" || statements[0] == "pushscope") {
                let scope = statements.shift();
                if (scope == "popscope" && line.length != indent) {
                    lines.push("empty");
                }
                // recompute indent
                newIndent = statements[0].start - line.start;
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
            console.log(indents, line, statements);
            let parseNode = statements.shift();
            if (!parseNode) {
                console.log(line, parseNode);
            } else if (parseNode && parseNode.start == line.start + indent && parseNode.length == line.length - 1 - indent) {
                lines.push([Array.from(indents), parseNode]);
            } else {
                if (parseNode.nodeType == 57) { // while loop
                    lines.push([Array.from(indents), parseNode]);
                    statements.unshift("pushscope", ...parseNode.whileSuite.statements, "popscope");
                } else {
                    console.log(line, parseNode);
                }
            }
        }
        console.log(statements);
        console.log(lines);
        setLines(lines);
    };
    analyzer.setCompletionCallback(analysisComplete);
    analyzer.setFileOpened(props.fileName, props.fileVersion, props.code);
    let editor;
    if (props.fileState == "loading") {
        editor = (<ActivityIndicator size="large" color="#00ff00" />);
    } else if (props.fileState == "loaded") {
        editor = (<FlatList
                    data={lines}
                    renderItem={({item}) => <CodeLine line={item}/>}
                />);
    }
    return (<KeyboardAvoidingView behavior="padding" enabled>
                {editor}
            </KeyboardAvoidingView>);
}