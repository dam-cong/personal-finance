package services

import "testing"

func TestParse(t *testing.T) {
	cases := []struct {
		name    string
		input   string
		content string
		amount  int64
	}{
		{"plain", "Cafe Highland 45000", "Cafe Highland", 45000},
		{"suffix k", "Cafe 45k", "Cafe", 45000},
		{"suffix K", "Cafe 45K", "Cafe", 45000},
		{"suffix k with space", "Cafe 45 k", "Cafe", 45000},
		{"dot thousand", "Cafe 45.000", "Cafe", 45000},
		{"comma thousand", "Cafe 45,000", "Cafe", 45000},
		{"space thousand", "Cafe 45 000", "Cafe", 45000},
		{"multi thousand", "Đi chợ 1.200.500", "Đi chợ", 1200500},
		{"newline", "Ăn sáng\n35000", "Ăn sáng", 35000},
		{"newline multi content", "Ăn sáng\nĂn trưa\n40000", "Ăn sáng\nĂn trưa", 40000},
		{"trailing spaces", "  Cafe 45.000  ", "Cafe", 45000},
		{"newline trailing", "Ăn sáng\n35000\n", "Ăn sáng", 35000},
		{"number in middle", "Ngày 5 ăn trưa 35000", "Ngày 5 ăn trưa", 35000},
		{"suffix triệu", "Cafe 1 triệu", "Cafe", 1000000},
		{"suffix triệu with space", "Cafe 1 triệu", "Cafe", 1000000},
		{"suffix triệu big", "Đi chợ 2.5 triệu", "Đi chợ", 2500000},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Parse(tc.input)
			if err != nil {
				t.Fatalf("Parse(%q) error: %v", tc.input, err)
			}
			if got.Content != tc.content {
				t.Errorf("content = %q, want %q", got.Content, tc.content)
			}
			if got.Amount != tc.amount {
				t.Errorf("amount = %d, want %d", got.Amount, tc.amount)
			}
		})
	}
}

func TestParseErrors(t *testing.T) {
	cases := []struct {
		name  string
		input string
	}{
		{"empty", ""},
		{"only spaces", "   "},
		{"no number", "abc"},
		{"only content", "Đi chợ"},
		{"number only", "45000"},
		{"newline empty amount", "Ăn sáng\n"},
		{"negative", "Cafe -45000"},
		{"non numeric", "Cafe abc 123xyz"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got, err := Parse(tc.input); err == nil {
				t.Fatalf("Parse(%q) = %+v, want error", tc.input, got)
			}
		})
	}
}
