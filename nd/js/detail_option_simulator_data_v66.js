(function(){
    "use strict";

    window.ND_OPTION_SIMULATOR = window.ND_OPTION_SIMULATOR || {
        products: {
            /*
            "상품번호": {
                showOnLoad: false,
                baseImage: "/nd/images/simulator/sample/base.png",
                groups: [
                    {
                        key: "size",
                        label: "상판 크기",
                        aliases: ["사이즈"],
                        optionIndex: 0,
                        layer: "base",
                        defaultValue: "1600",
                        options: [
                            { value: "1600", label: "1600", matchLabels: ["1600"], image: "/nd/images/simulator/sample/size-1600.png" },
                            { value: "1800", label: "1800", matchLabels: ["1800"], image: "/nd/images/simulator/sample/size-1800.png" }
                        ]
                    },
                    {
                        key: "topColor",
                        label: "상판 컬러",
                        aliases: ["상판색상"],
                        optionIndex: 1,
                        layer: "top",
                        options: [
                            { value: "oak", label: "오크", matchLabels: ["오크"], image: "/nd/images/simulator/sample/top-oak.png", swatch: "#c8a36f" },
                            { value: "walnut", label: "월넛", matchLabels: ["월넛"], image: "/nd/images/simulator/sample/top-walnut.png", swatch: "#6a4329" }
                        ]
                    },
                    {
                        key: "frameColor",
                        label: "프레임 컬러",
                        aliases: ["프레임색상", "다리 컬러"],
                        optionIndex: 2,
                        layer: "frame",
                        options: [
                            { value: "white", label: "화이트", matchLabels: ["화이트"], image: "/nd/images/simulator/sample/frame-white.png", swatch: "#f4f1e8" },
                            { value: "black", label: "블랙", matchLabels: ["블랙"], image: "/nd/images/simulator/sample/frame-black.png", swatch: "#111111" }
                        ]
                    }
                ]
            }
            */
        },
        productNameRules: [
            {
                keywordGroups: [
                    ["래더", "알로"],
                    ["래더", "alo"]
                ],
                excludeKeywords: ["납품사례"],
                config: {
                    showOnLoad: false,
                    groups: [
                        {
                            key: "topSize",
                            label: "상판 크기",
                            aliases: ["상판사이즈", "상판 타입", "사이즈", "크기"],
                            optionIndex: 0,
                            defaultValue: "plus",
                            options: [
                                { value: "basic", label: "600 x 400", matchLabels: ["600 x 400 x 720mm", "600x400x720mm", "기본", "기본형"] },
                                { value: "plus", label: "650 x 450", matchLabels: ["650 x 450 x 720mm", "650x450x720mm", "플러스", "PLUS"] },
                                { value: "wide", label: "700 x 500", matchLabels: ["700 x 500 x 720mm", "700x500x720mm", "와이드", "WIDE"] }
                            ]
                        },
                        {
                            key: "topShape",
                            label: "상판 형태",
                            aliases: ["상판 모서리", "상판 쉐입", "상판 엣지", "라운드/엣지"],
                            optionIndex: 1,
                            defaultValue: "edge",
                            options: [
                                { value: "round", label: "라운드 상판", matchLabels: ["라운드", "라운드 상판", "ROUND"] },
                                { value: "edge", label: "엣지 상판", matchLabels: ["엣지", "엣지 상판", "EDGE"] }
                            ]
                        },
                        {
                            key: "topColor",
                            label: "상판 컬러",
                            aliases: ["상판색상", "상판 색상", "상판컬러"],
                            optionIndex: 2,
                            defaultValue: "matte-white",
                            options: [
                                { value: "light-gray", label: "라이트그레이", matchLabels: ["라이트그레이", "라이트 그레이"], swatch: "#c8c9c6" },
                                { value: "matte-white", label: "매트화이트", matchLabels: ["매트화이트", "매트 화이트"], swatch: "#f1eee8" },
                                { value: "maple", label: "메이플", matchLabels: ["메이플"], swatch: "#d4b177" },
                                { value: "moon-gray", label: "문그레이", matchLabels: ["문그레이", "문 그레이"], swatch: "#8d908b" },
                                { value: "beige", label: "베이지", matchLabels: ["베이지"], swatch: "#d8c3a5" },
                                { value: "acacia", label: "아카시아", matchLabels: ["아카시아"], swatch: "#b98755" },
                                { value: "walnut", label: "월넛", matchLabels: ["월넛"], swatch: "#6a4329" },
                                { value: "pastel-green", label: "파스텔그린", matchLabels: ["파스텔그린", "파스텔 그린"], swatch: "#b9c9ae" },
                                { value: "high-gloss-white", label: "하이글로시화이트", matchLabels: ["하이글로시화이트", "하이글로시 화이트"], swatch: "#ffffff" }
                            ]
                        },
                        {
                            key: "seatColor",
                            label: "좌판 컬러",
                            aliases: ["좌판색상", "좌판 색상", "좌판컬러", "의자 컬러", "의자 색상"],
                            optionIndex: 4,
                            defaultValue: "black",
                            options: [
                                { value: "beige", label: "베이지", matchLabels: ["베이지"], swatch: "#d4c4ac" },
                                { value: "deep-green", label: "딥그린", matchLabels: ["딥그린", "딥 그린"], swatch: "#536b5c" },
                                { value: "pastel-green", label: "파스텔그린", matchLabels: ["파스텔그린", "파스텔 그린"], swatch: "#b7c7b4" },
                                { value: "mocha-brown", label: "모카브라운", matchLabels: ["모카브라운", "모카 브라운"], swatch: "#7a604d" },
                                { value: "butter-yellow", label: "버터옐로우", matchLabels: ["버터옐로우", "버터 옐로우"], swatch: "#e4d18d" },
                                { value: "black", label: "블랙", matchLabels: ["블랙"], swatch: "#171717" }
                            ]
                        },
                        {
                            key: "frameColor",
                            label: "프레임 컬러",
                            aliases: ["프레임색상", "프레임 색상", "프레임컬러"],
                            optionIndex: 3,
                            defaultValue: "white",
                            options: [
                                { value: "black", label: "블랙", matchLabels: ["블랙"], swatch: "#171717" },
                                { value: "white", label: "화이트", matchLabels: ["화이트"], swatch: "#f3f0e8" }
                            ]
                        }
                    ],
                    layers: [
                        {
                            key: "frame",
                            order: 0,
                            imageTemplate: "/nd/images/simulator/ladder-allo/frame/{topSize}-{frameColor}.png",
                            valueMap: {
                                topSize: {
                                    "basic": "basic-plus",
                                    "plus": "basic-plus",
                                    "wide": "wide"
                                }
                            }
                        },
                        {
                            key: "top",
                            order: 1,
                            imageTemplate: "/nd/images/simulator/ladder-allo/top/{topSize}-{topShape}-{topColor}.png"
                        },
                        {
                            key: "seat",
                            order: 2,
                            imageTemplate: "/nd/images/simulator/ladder-allo/seat/{seatColor}.png"
                        }
                    ]
                }
            }
        ]
    };

    window.ND_OPTION_SIMULATOR_DEMO = {
        showOnLoad: true,
        groups: [
            {
                key: "size",
                label: "상판 크기",
                aliases: ["사이즈"],
                optionIndex: 0,
                layer: "edge",
                defaultValue: "1600",
                options: [
                    { value: "1400", label: "1400", matchLabels: ["1400"], color: "#b08b5f", swatch: "#b08b5f" },
                    { value: "1600", label: "1600", matchLabels: ["1600"], color: "#9b764f", swatch: "#9b764f" },
                    { value: "1800", label: "1800", matchLabels: ["1800"], color: "#7b5c3e", swatch: "#7b5c3e" }
                ]
            },
            {
                key: "topColor",
                label: "상판 컬러",
                aliases: ["상판색상", "상판 색상"],
                optionIndex: 1,
                layer: "top",
                defaultValue: "oak",
                options: [
                    { value: "oak", label: "오크", matchLabels: ["오크", "내추럴"], color: "#d0ad78", swatch: "#d0ad78" },
                    { value: "walnut", label: "월넛", matchLabels: ["월넛"], color: "#765033", swatch: "#765033" },
                    { value: "stone", label: "스톤", matchLabels: ["스톤", "그레이"], color: "#a7a7a0", swatch: "#a7a7a0" }
                ]
            },
            {
                key: "frameColor",
                label: "프레임 컬러",
                aliases: ["프레임색상", "다리 컬러", "다리 색상"],
                optionIndex: 2,
                layer: "frame",
                defaultValue: "black",
                options: [
                    { value: "black", label: "블랙", matchLabels: ["블랙"], color: "#151515", swatch: "#151515" },
                    { value: "white", label: "화이트", matchLabels: ["화이트"], color: "#ece8df", swatch: "#ece8df" },
                    { value: "chrome", label: "크롬", matchLabels: ["크롬", "실버"], color: "#9ca2a5", swatch: "#9ca2a5" }
                ]
            },
            {
                key: "chairColor",
                label: "의자 컬러",
                aliases: ["의자색상", "체어 컬러"],
                optionIndex: 3,
                layer: "chair",
                defaultValue: "blue",
                options: [
                    { value: "blue", label: "블루그레이", matchLabels: ["블루", "그레이"], color: "#496777", swatch: "#496777" },
                    { value: "cream", label: "크림", matchLabels: ["크림", "아이보리"], color: "#dfd3bd", swatch: "#dfd3bd" },
                    { value: "green", label: "세이지", matchLabels: ["그린", "세이지"], color: "#64735f", swatch: "#64735f" }
                ]
            }
        ]
    };
})();
