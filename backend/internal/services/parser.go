package services

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

type Parsed struct {
	Content string
	Amount  int64
}

var (
	amountAtEndRe = regexp.MustCompile(`(\d[\d.,\s]*?)(\s*(?:[kK]|triệu))?\s*$`)
	amountOnlyRe  = regexp.MustCompile(`^\s*(\d[\d.,\s]*)(\s*(?:[kK]|triệu))?\s*$`)
)

// Parse tách nội dung và số tiền từ tin nhắn chi tiêu.
// Hỗ trợ: "Cafe 45000", "Cafe 45k", "Cafe 45.000", "Cafe 45,000",
// "Cafe 45 000", "Ăn sáng\n35000".
func Parse(input string) (*Parsed, error) {
	s := strings.TrimSpace(input)
	if s == "" {
		return nil, fmt.Errorf("chuỗi rỗng")
	}

	content := s
	var rawAmount string

	if strings.Contains(s, "\n") {
		lines := strings.Split(s, "\n")
		last := strings.TrimSpace(lines[len(lines)-1])
		if last == "" {
			return nil, fmt.Errorf("không tìm thấy số tiền")
		}
		content = strings.TrimSpace(strings.Join(lines[:len(lines)-1], "\n"))
		rawAmount = last
	} else {
		loc := amountAtEndRe.FindStringIndex(s)
		if loc == nil {
			return nil, fmt.Errorf("không tìm thấy số tiền")
		}
		content = strings.TrimSpace(s[:loc[0]])
		rawAmount = s[loc[0]:]
		if strings.HasSuffix(content, "-") {
			return nil, fmt.Errorf("số tiền không hợp lệ")
		}
	}

	amount, err := parseAmount(rawAmount)
	if err != nil {
		return nil, err
	}
	if amount <= 0 {
		return nil, fmt.Errorf("số tiền phải lớn hơn 0")
	}
	if content == "" {
		return nil, fmt.Errorf("thiếu nội dung")
	}

	return &Parsed{Content: content, Amount: amount}, nil
}

func parseAmount(raw string) (int64, error) {
	m := amountOnlyRe.FindStringSubmatch(raw)
	if m == nil {
		return 0, fmt.Errorf("không tìm thấy số tiền")
	}
	suffix := strings.ToLower(strings.TrimSpace(m[2]))
	if suffix == "k" {
		num := strings.NewReplacer(".", "", ",", "", " ", "").Replace(m[1])
		v, err := strconv.ParseInt(num, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("số tiền không hợp lệ")
		}
		if v > math.MaxInt64/1000 {
			return 0, fmt.Errorf("số tiền quá lớn")
		}
		return v * 1000, nil
	}
	if suffix == "triệu" {
		numStr := strings.NewReplacer(",", "", " ", "").Replace(m[1])
		f, err := strconv.ParseFloat(numStr, 64)
		if err != nil {
			return 0, fmt.Errorf("số tiền không hợp lệ")
		}
		v := int64(f * 1000000)
		if v <= 0 {
			return 0, fmt.Errorf("số tiền phải lớn hơn 0")
		}
		return v, nil
	}
	num := strings.NewReplacer(".", "", ",", "", " ", "").Replace(m[1])
	v, err := strconv.ParseInt(num, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("số tiền không hợp lệ")
	}
	return v, nil
}
